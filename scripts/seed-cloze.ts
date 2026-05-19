/**
 * Beispiel-Lückentext-Aufgabe für die Test Schule.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "../src/db/schema";

const sqlite = new Database(path.join(process.cwd(), "data", "testschule.db"));
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function main() {
  const teacher = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.role, "teacher") });
  const klass = await db.query.classes.findFirst();
  if (!teacher || !klass) throw new Error("Erst seed.ts laufen lassen");

  const existing = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.type, "cloze"),
  });
  if (existing) {
    console.log("· Lückentext-Aufgabe existiert bereits");
    sqlite.close();
    return;
  }

  console.log("→ Beispiel-Lückentext anlegen…");

  const text =
    "Der normale Puls in Ruhe liegt zwischen {{60}} und {{100}} Schlägen pro Minute.\n\n" +
    "Ab einem Blutdruck von {{140/90}} mmHg spricht man von einer {{Hypertonie}}.\n\n" +
    "Die Sauerstoffsättigung sollte beim Erwachsenen zwischen {{95}} und 100 % liegen.\n\n" +
    "Ein Druckgeschwür durch andauernden Druck nennt man {{Dekubitus}}.\n\n" +
    "Die WHO empfiehlt eine Händedesinfektion in {{5}} Momenten.";

  const blanks = [
    { index: 0, answers: ["60"], caseSensitive: false },
    { index: 1, answers: ["100"], caseSensitive: false },
    { index: 2, answers: ["140/90", "140 / 90"], caseSensitive: false },
    { index: 3, answers: ["Hypertonie", "Bluthochdruck"], caseSensitive: false },
    { index: 4, answers: ["95"], caseSensitive: false },
    { index: 5, answers: ["Dekubitus", "Druckgeschwür"], caseSensitive: false },
    { index: 6, answers: ["5", "fünf"], caseSensitive: false },
  ];

  await db.insert(schema.tasks).values({
    classId: klass.id,
    authorId: teacher.id,
    type: "cloze",
    title: "Pflege-Grundlagen: Lückentext",
    description: "Vitalwerte, Begriffe und Hygiene-Standards",
    payload: JSON.stringify({ text, blanks }),
    xpReward: 25,
    publishedAt: new Date(),
  });
  console.log(`  ✓ Lückentext mit ${blanks.length} Lücken`);
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
