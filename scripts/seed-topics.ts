/**
 * Beispiel-Themen für die Test Schule + Zuordnung bestehender Aufgaben.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const sqlite = new Database(path.join(process.cwd(), "data", "testschule.db"));
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function main() {
  const klass = await db.query.classes.findFirst();
  if (!klass) throw new Error("Keine Klasse vorhanden");

  const existing = await db.query.topics.findMany({
    where: (t, { eq }) => eq(t.classId, klass.id),
  });
  if (existing.length > 0) {
    console.log("· Themen existieren bereits");
    sqlite.close();
    return;
  }

  console.log("→ Beispiel-Themen anlegen…");
  const sample = [
    { title: "Vitalwerte & Monitoring", desc: "Puls, Blutdruck, Atemfrequenz, SpO2, Temperatur" },
    { title: "Hygiene & Infektionsprävention", desc: "Händedesinfektion, Asepsis, Pflegestandards" },
    { title: "Pflegeprozess & Dokumentation", desc: "Assessment, Pflegediagnosen, Verlaufsdoku" },
    { title: "Notfälle erkennen", desc: "Apoplex, Schmerzbeurteilung, kritische Werte" },
    { title: "Pflege-Grundbegriffe", desc: "Fachvokabular für die ersten Ausbildungsjahre" },
  ];
  const topics: any[] = [];
  for (let i = 0; i < sample.length; i++) {
    const [t] = await db.insert(schema.topics).values({
      classId: klass.id,
      title: sample[i].title,
      description: sample[i].desc,
      position: i + 1,
    }).returning();
    topics.push(t);
    console.log(`  ✓ ${t.title}`);
  }

  // Bestehende Aufgaben zuordnen
  console.log("→ Bestehende Aufgaben Themen zuordnen…");
  const allTasks = await db.query.tasks.findMany({ where: (t, { eq }) => eq(t.classId, klass.id) });

  const mapping: Record<string, string> = {
    "Vitalwerte & Grundlagen": "Vitalwerte & Monitoring",
    "Vitalwerte-Monitor: Werte erkennen": "Vitalwerte & Monitoring",
    "Pflege-ABC: Fachbegriffe": "Pflege-Grundbegriffe",
    "Fachbegriffe: Pflege-ABC": "Pflege-Grundbegriffe",
    "Pflege-Grundlagen: Lückentext": "Pflege-Grundbegriffe",
  };

  for (const t of allTasks) {
    const wantedTopic = mapping[t.title];
    if (!wantedTopic) continue;
    const topic = topics.find((x) => x.title === wantedTopic);
    if (!topic) continue;
    await db.update(schema.tasks).set({ topicId: topic.id }).where(eq(schema.tasks.id, t.id));
    console.log(`  → "${t.title}" → ${topic.title}`);
  }

  console.log("\n✓ Themen-Beispieldaten bereit.");
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
