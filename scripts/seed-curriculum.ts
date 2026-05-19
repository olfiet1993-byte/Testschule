/**
 * Seed: Offizielles Pflege-Curriculum (PflAPrV — 5 Kompetenzbereiche).
 * Globale Einträge (schoolId = null), für alle Schulen verfügbar.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "../src/db/schema";
import { eq, isNull, and } from "drizzle-orm";

const dbPath = path.join(process.cwd(), "data", "testschule.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

type Unit = { code: string; title: string; description?: string; children?: Unit[] };

const CURRICULUM: Unit[] = [
  {
    code: "I",
    title: "Pflegeprozesse und Pflegediagnostik",
    description: "Pflegeprozesse in akuten und dauerhaften Pflegesituationen planen, durchführen und evaluieren.",
    children: [
      { code: "I.1", title: "Pflegeprozess und Pflegediagnostik" },
      { code: "I.2", title: "Vital- und Körperfunktionen erheben und überwachen" },
      { code: "I.3", title: "Mobilität fördern und Bewegungseinschränkungen vorbeugen" },
      { code: "I.4", title: "Ernährungs- und Ausscheidungssituation" },
      { code: "I.5", title: "Wundversorgung und Hautpflege" },
      { code: "I.6", title: "Pflege bei spezifischen Erkrankungen (innere Medizin, Chirurgie, Neurologie)" },
      { code: "I.7", title: "Pflege in der Onkologie / Palliativpflege" },
      { code: "I.8", title: "Pflege von Kindern und Jugendlichen" },
      { code: "I.9", title: "Pflege älterer Menschen / Geriatrie" },
      { code: "I.10", title: "Pflege bei psychischen Erkrankungen" },
    ],
  },
  {
    code: "II",
    title: "Kommunikation und Beratung",
    description: "Kommunikation und Beratung personen- und situationsbezogen gestalten.",
    children: [
      { code: "II.1", title: "Kommunikation mit zu pflegenden Menschen" },
      { code: "II.2", title: "Beratung und Anleitung" },
      { code: "II.3", title: "Edukation von Angehörigen" },
      { code: "II.4", title: "Umgang mit herausforderndem Verhalten" },
    ],
  },
  {
    code: "III",
    title: "Intra- und interprofessionelles Handeln",
    description: "Im Team und mit anderen Berufsgruppen arbeiten.",
    children: [
      { code: "III.1", title: "Übergaben, Dokumentation, Berichtswesen" },
      { code: "III.2", title: "Zusammenarbeit mit anderen Gesundheitsberufen" },
      { code: "III.3", title: "Notfallmanagement und Erste Hilfe" },
      { code: "III.4", title: "Hygiene und Infektionsschutz" },
      { code: "III.5", title: "Arzneimittellehre / Medikamentenmanagement" },
    ],
  },
  {
    code: "IV",
    title: "Rechtliches Handeln",
    description: "Das eigene Handeln an rechtlichen Vorgaben ausrichten.",
    children: [
      { code: "IV.1", title: "Berufsgesetz, Pflegeberufegesetz, PflAPrV" },
      { code: "IV.2", title: "Datenschutz und Schweigepflicht" },
      { code: "IV.3", title: "Patientenrechte, Aufklärung, Einwilligung" },
      { code: "IV.4", title: "Haftung, Delegation, Verantwortung" },
    ],
  },
  {
    code: "V",
    title: "Reflexion und Berufsidentität",
    description: "Das eigene Handeln auf Grundlage von Gesetzen, Verordnungen und ethischen Leitlinien reflektieren.",
    children: [
      { code: "V.1", title: "Berufsethik und Werte" },
      { code: "V.2", title: "Berufsverständnis und professionelle Haltung" },
      { code: "V.3", title: "Selbstpflege und Resilienz" },
      { code: "V.4", title: "Lebenslanges Lernen / Evidence-based Nursing" },
    ],
  },
];

async function upsertUnit(code: string, title: string, description: string | null, parentId: string | null, position: number): Promise<string> {
  const existing = await db.query.curriculumUnits.findFirst({
    where: and(eq(schema.curriculumUnits.code, code), isNull(schema.curriculumUnits.schoolId)),
  });
  if (existing) {
    await db.update(schema.curriculumUnits)
      .set({ title, description, parentId, position })
      .where(eq(schema.curriculumUnits.id, existing.id));
    return existing.id;
  }
  const [u] = await db.insert(schema.curriculumUnits).values({
    schoolId: null,
    parentId,
    code,
    title,
    description,
    position,
    createdAt: new Date(),
  }).returning();
  return u.id;
}

async function main() {
  console.log("→ Seede Pflege-Curriculum …");
  let topPos = 0;
  for (const top of CURRICULUM) {
    const topId = await upsertUnit(top.code, top.title, top.description ?? null, null, topPos++);
    console.log("✓", top.code, top.title);
    let childPos = 0;
    for (const child of top.children ?? []) {
      await upsertUnit(child.code, child.title, child.description ?? null, topId, childPos++);
    }
  }
  console.log("Fertig. Globale Curriculum-Einträge:", CURRICULUM.reduce((a, c) => a + 1 + (c.children?.length ?? 0), 0));
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
