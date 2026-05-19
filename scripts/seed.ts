import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import * as schema from "../src/db/schema";
import { generateInviteCode } from "../src/lib/utils";

const dbPath = path.join(process.cwd(), "data", "testschule.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function main() {
  console.log("→ Seeding Test Schule …");

  let school = await db.query.schools.findFirst();
  if (!school) {
    const [s] = await db.insert(schema.schools).values({ name: "Test Schule" }).returning();
    school = s;
    console.log("  ✓ Schule:", s.name);
  } else {
    console.log("  · Schule existiert bereits");
  }

  const existingTeacher = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, "lehrer@test.schule"),
  });

  let teacher = existingTeacher;
  if (!teacher) {
    const hash = await bcrypt.hash("test1234", 10);
    const [t] = await db.insert(schema.users).values({
      schoolId: school.id,
      role: "teacher",
      email: "lehrer@test.schule",
      passwordHash: hash,
      displayName: "Frau Berger",
    }).returning();
    teacher = t;
    console.log("  ✓ Lehrer-Account: lehrer@test.schule / test1234");
  } else {
    console.log("  · Lehrer-Account vorhanden");
  }

  const yearLabels = ["1. Jahr", "2. Jahr", "3. Jahr", "4. Jahr"];
  const existingYears = await db.query.yearGroups.findMany();
  if (existingYears.length === 0) {
    for (let i = 0; i < yearLabels.length; i++) {
      await db.insert(schema.yearGroups).values({
        schoolId: school.id,
        name: yearLabels[i],
        position: i + 1,
      });
    }
    console.log("  ✓ Jahrgänge angelegt");
  }

  const existingClasses = await db.query.classes.findMany();
  if (existingClasses.length === 0) {
    const year1 = await db.query.yearGroups.findFirst({
      where: (y, { eq }) => eq(y.name, "1. Jahr"),
    });
    const code = generateInviteCode();
    const [c] = await db.insert(schema.classes).values({
      schoolId: school.id,
      yearGroupId: year1!.id,
      teacherId: teacher.id,
      name: "PF24a",
      inviteCode: code,
      color: "#0ea5e9",
    }).returning();
    console.log(`  ✓ Beispielklasse: ${c.name} (Einlade-Code: ${code})`);
  }

  console.log("\n=== Bereit zum Login ===");
  console.log("URL:      http://localhost:3000/login");
  console.log("E-Mail:   lehrer@test.schule");
  console.log("Passwort: test1234");
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
