/**
 * Einmal-Skript: liest alle Daten aus SQLite und schreibt sie in einen Postgres-Cluster.
 *
 * Voraussetzung:
 *  - SQLite-Datei unter data/testschule.db (Quelle)
 *  - DATABASE_URL_PG=postgres://… (Ziel)
 *  - Postgres-Schema schon angelegt (drizzle-kit gegen schema-pg.ts laufen lassen)
 *
 * Aufruf:
 *   DATABASE_URL_PG=postgres://… npx tsx scripts/migrate-to-postgres.ts
 */

import Database from "better-sqlite3";
import path from "node:path";

const PG_URL = process.env.DATABASE_URL_PG;
if (!PG_URL) {
  console.error("✗ DATABASE_URL_PG fehlt — z. B. postgres://user:pass@host/db");
  process.exit(1);
}

// Postgres-Client lazy laden (peer-Dep, weil nur für Migration genutzt)
let pgClient: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require("postgres");
  pgClient = postgres(PG_URL, { onnotice: () => {} });
} catch {
  console.error("✗ Bitte vorher installieren:  npm install postgres");
  process.exit(1);
}

const sqlite = new Database(path.join(process.cwd(), "data", "testschule.db"), { readonly: true });

// Tabellen in der korrekten Reihenfolge (Foreign-Key-Constraints respektiert)
const TABLES = [
  "schools",
  "year_groups",
  "users",
  "classes",
  "class_members",
  "class_teachers",
  "groups",
  "group_members",
  "topics",
  "content_items",
  "tasks",
  "submissions",
  "badges",
  "user_badges",
  "audit_log",
  "schedule_slots",
  "notifications",
  "messages",
  "teacher_invites",
  "questions",
  "answers",
];

function convertRow(row: any) {
  // SQLite speichert Booleans als 0/1, Timestamps als integer (Unix-ms) wegen Drizzle's "timestamp"-Mode
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "number" && k.endsWith("_at")) {
      out[k] = new Date(v);
    } else if (k === "resolved" || k === "is_accepted" || k === "exam_mode") {
      out[k] = !!v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  console.log("→ Beginne SQLite → Postgres Migration");

  for (const table of TABLES) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as any[];
    if (rows.length === 0) {
      console.log(`  · ${table}: leer`);
      continue;
    }
    const converted = rows.map(convertRow);
    const cols = Object.keys(converted[0]);
    const placeholders = cols.map((c) => `"${c}"`).join(", ");

    // Insert in Batches von 500
    let inserted = 0;
    for (let i = 0; i < converted.length; i += 500) {
      const batch = converted.slice(i, i + 500);
      const values = batch.map((r) => cols.map((c) => r[c]));
      // postgres-js spread-syntax
      const valuesSQL = batch
        .map(
          (_, bi) =>
            "(" + cols.map((__, ci) => `$${bi * cols.length + ci + 1}`).join(", ") + ")",
        )
        .join(", ");
      const flatValues = values.flat();
      const sql = `INSERT INTO "${table}" (${placeholders}) VALUES ${valuesSQL} ON CONFLICT DO NOTHING`;
      await pgClient.unsafe(sql, flatValues);
      inserted += batch.length;
    }
    console.log(`  ✓ ${table}: ${inserted} Zeilen`);
  }

  console.log("\n✓ Migration abgeschlossen.");
  await pgClient.end();
  sqlite.close();
}

main().catch((e) => {
  console.error("✗ Fehler:", e);
  process.exit(1);
});
