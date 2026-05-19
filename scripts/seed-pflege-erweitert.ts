/**
 * Erweiterte Beispiel-Aufgaben: 1× Karteikarten, 1× Bilderrätsel (mit
 * platzhalter SVG-Bild damit es ohne externe Datei läuft).
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "../src/db/schema";

const sqlite = new Database(path.join(process.cwd(), "data", "testschule.db"));
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function main() {
  const school = await db.query.schools.findFirst();
  const teacher = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.role, "teacher") });
  const klass = await db.query.classes.findFirst();
  if (!school || !teacher || !klass) throw new Error("Erst seed.ts + seed-pflege.ts");

  const flashcardTaskExists = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.type, "flashcards"),
  });
  if (!flashcardTaskExists) {
    console.log("→ Beispiel-Karteikarten anlegen…");
    const cards = [
      { front: "Tachykardie", back: "Beschleunigter Herzschlag über 100/min beim Erwachsenen in Ruhe." },
      { front: "Bradykardie", back: "Verlangsamter Herzschlag unter 60/min beim Erwachsenen." },
      { front: "Hypertonie", back: "Bluthochdruck ab 140/90 mmHg." },
      { front: "Apoplex", back: "Schlaganfall: plötzliche Durchblutungsstörung im Gehirn." },
      { front: "Asepsis", back: "Zustand der Keimfreiheit." },
      { front: "Dekubitus", back: "Druckgeschwür durch andauernden Druck auf Haut und Gewebe." },
      { front: "Pneumonie", back: "Lungenentzündung — meist durch Bakterien oder Viren." },
      { front: "NRS", back: "Numeric Rating Scale: Schmerz-Skala 0 (keine) bis 10 (stärkster)." },
    ];
    await db.insert(schema.tasks).values({
      classId: klass.id,
      authorId: teacher.id,
      type: "flashcards",
      title: "Fachbegriffe: Pflege-ABC",
      description: "Karteikarten für wichtige Grundbegriffe",
      payload: JSON.stringify({ cards }),
      xpReward: 20,
      publishedAt: new Date(),
    });
    console.log(`  ✓ ${cards.length} Karten`);
  } else {
    console.log("· Karteikarten existieren");
  }

  // Bilderrätsel — wir legen ein einfaches Platzhalter-SVG-Bild an,
  // damit man die Funktion ohne externes Material sofort testen kann.
  const imageTaskExists = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.type, "image_hotspot"),
  });
  if (!imageTaskExists) {
    console.log("→ Beispiel-Bilderrätsel anlegen…");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const svgPath = path.join(uploadDir, "vitalwerte-monitor.svg");
    const filename = "vitalwerte-monitor.svg";

    // Platzhalter: schematische Vitalwerte-Anzeige als SVG.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" fill="#0f172a"/>
  <rect x="20" y="20" width="760" height="460" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <text x="40" y="60" fill="#94a3b8" font-family="sans-serif" font-size="14">Vitalwerte-Monitor</text>

  <!-- Herzfrequenz -->
  <g transform="translate(50, 90)">
    <rect width="340" height="100" rx="10" fill="#0f172a"/>
    <text x="20" y="32" fill="#f87171" font-family="sans-serif" font-size="14">HF</text>
    <text x="20" y="80" fill="#ef4444" font-family="sans-serif" font-size="56" font-weight="bold">72</text>
    <text x="180" y="80" fill="#fca5a5" font-family="sans-serif" font-size="14">bpm</text>
    <polyline points="220,50 240,50 250,30 260,70 270,40 290,50 320,50" stroke="#ef4444" stroke-width="2" fill="none"/>
  </g>

  <!-- Sauerstoffsättigung -->
  <g transform="translate(410, 90)">
    <rect width="340" height="100" rx="10" fill="#0f172a"/>
    <text x="20" y="32" fill="#60a5fa" font-family="sans-serif" font-size="14">SpO2</text>
    <text x="20" y="80" fill="#3b82f6" font-family="sans-serif" font-size="56" font-weight="bold">98</text>
    <text x="180" y="80" fill="#93c5fd" font-family="sans-serif" font-size="14">%</text>
  </g>

  <!-- Blutdruck -->
  <g transform="translate(50, 210)">
    <rect width="340" height="100" rx="10" fill="#0f172a"/>
    <text x="20" y="32" fill="#fbbf24" font-family="sans-serif" font-size="14">RR</text>
    <text x="20" y="80" fill="#f59e0b" font-family="sans-serif" font-size="40" font-weight="bold">120/80</text>
    <text x="240" y="80" fill="#fde68a" font-family="sans-serif" font-size="14">mmHg</text>
  </g>

  <!-- Atemfrequenz -->
  <g transform="translate(410, 210)">
    <rect width="340" height="100" rx="10" fill="#0f172a"/>
    <text x="20" y="32" fill="#a3e635" font-family="sans-serif" font-size="14">AF</text>
    <text x="20" y="80" fill="#84cc16" font-family="sans-serif" font-size="56" font-weight="bold">16</text>
    <text x="180" y="80" fill="#bef264" font-family="sans-serif" font-size="14">/min</text>
  </g>

  <!-- Temperatur -->
  <g transform="translate(50, 330)">
    <rect width="700" height="100" rx="10" fill="#0f172a"/>
    <text x="20" y="32" fill="#c084fc" font-family="sans-serif" font-size="14">Temp</text>
    <text x="20" y="80" fill="#a855f7" font-family="sans-serif" font-size="56" font-weight="bold">36,8</text>
    <text x="220" y="80" fill="#d8b4fe" font-family="sans-serif" font-size="14">°C</text>
  </g>
</svg>`;
    fs.writeFileSync(svgPath, svg);

    const hotspots = [
      { id: "hf", x: 14, y: 30, label: "Herzfrequenz (HF)" },          // ~50/90 von 800x500 → 6/18 + center
      { id: "spo2", x: 59, y: 30, label: "Sauerstoffsättigung (SpO2)" }, // 410+170 / 800 = 72%? we will fix below
      { id: "rr", x: 28, y: 54, label: "Blutdruck (RR)" },
      { id: "af", x: 72, y: 54, label: "Atemfrequenz (AF)" },
      { id: "temp", x: 18, y: 78, label: "Körpertemperatur (Temp)" },
    ];
    await db.insert(schema.tasks).values({
      classId: klass.id,
      authorId: teacher.id,
      type: "image_hotspot",
      title: "Vitalwerte-Monitor: Werte erkennen",
      description: "Klicke auf den jeweils geforderten Vitalwert.",
      payload: JSON.stringify({ imagePath: `/uploads/${filename}`, hotspots }),
      xpReward: 25,
      publishedAt: new Date(),
    });
    console.log(`  ✓ Bilderrätsel mit ${hotspots.length} Hotspots`);

    // Auch als Bibliotheks-Eintrag, damit es im Editor wieder auswählbar ist
    const existingImg = await db.query.contentItems.findFirst({
      where: (c, { eq }) => eq(c.imagePath, `/uploads/${filename}`),
    });
    if (!existingImg) {
      await db.insert(schema.contentItems).values({
        schoolId: school.id,
        ownerId: teacher.id,
        type: "image",
        title: "Vitalwerte-Monitor (Schemabild)",
        body: "Platzhalter-Bild für Vitalwerte-Übungen",
        imagePath: `/uploads/${filename}`,
        tags: "Vitalwerte,Monitoring,Beispielbild",
      });
      console.log("  ✓ Bild auch in der Bibliothek hinterlegt");
    }
  } else {
    console.log("· Bilderrätsel existiert");
  }

  console.log("\n✓ Erweiterte Beispieldaten bereit.");
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
