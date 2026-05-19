/**
 * Beispiel-Fallstudie für die Test Schule: Sturzprophylaxe Frau M.
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
    where: (t, { eq }) => eq(t.type, "case_study"),
  });
  if (existing) {
    console.log("· Fallstudie existiert bereits");
    sqlite.close();
    return;
  }

  // Themen-Mapping (optional)
  const notfallTopic = await db.query.topics.findFirst({
    where: (t, { eq, and }) => and(eq(t.classId, klass.id), eq(t.title, "Notfälle erkennen")),
  });
  const hygieneTopic = await db.query.topics.findFirst({
    where: (t, { eq, and }) => and(eq(t.classId, klass.id), eq(t.title, "Hygiene & Infektionsprävention")),
  });

  console.log("→ Beispiel-Fallstudie 'Sturzprophylaxe Frau M.' anlegen…");

  // Schritt-IDs vorab generieren, damit die Verlinkung stimmt
  const s1 = "step01";
  const s2 = "step02";
  const s3 = "step03";
  const s4 = "step04";
  const s5 = "step05";

  const intro =
    "Frau M., 82 Jahre, kommt nach einer hospitalisierten Sturzfraktur in die Pflegeeinrichtung zurück. " +
    "Sie ist seit 3 Tagen wieder da, mobilisiert sich mit Rollator, aber unsicher. " +
    "Sie nehmen heute den Frühdienst auf. Die Übergabe weist auf Schwindel beim Aufstehen hin, " +
    "und Frau M. nimmt seit gestern ein neues Antihypertensivum.";

  const steps = [
    {
      id: s1,
      description: "Sie betreten das Zimmer um 06:30 Uhr. Frau M. ist wach, möchte zur Toilette und steht bereits an der Bettkante.",
      question: "Was tun Sie als Erstes?",
      options: [
        {
          text: "Hände desinfizieren, dann Frau M. die Hand reichen und mit ihr gemeinsam aufstehen, RR-Wert kontrollieren.",
          feedback: "Genau richtig — bei orthostatischer Symptomatik nach neuer antihypertensiver Therapie ist sicheres, begleitetes Aufstehen Pflicht.",
          isCorrect: true,
          next: s2,
        },
        {
          text: "Schnell zum Bett gehen und Frau M. zurück ins Bett zwingen, weil das zu gefährlich ist.",
          feedback: "Zwang und Festhalten sind sowohl ethisch als auch rechtlich problematisch — und nehmen Frau M. ihre Autonomie. Stattdessen begleiten.",
          isCorrect: false,
          next: s2,
        },
        {
          text: "Schnell zum Bett laufen, ohne Hände zu desinfizieren, und sie auf den Rollator setzen.",
          feedback: "Hygiene-Standards gelten auch in Eilsituationen. Außerdem fehlt die Blutdruck-Kontrolle.",
          isCorrect: false,
          next: s2,
        },
      ],
    },
    {
      id: s2,
      description: "Beim Aufstehen gibt Frau M. an, ihr werde schwarz vor Augen. Sie schwankt. Der Blutdruck ist 95/55 mmHg im Stehen (lag im Sitzen bei 130/80).",
      question: "Wie interpretieren Sie die Werte und was tun Sie?",
      options: [
        {
          text: "Klassische Orthostase — Frau M. langsam wieder zurück ins Bett, RR im Liegen kontrollieren, Arzt informieren.",
          feedback: "Korrekt: RR-Abfall > 20 mmHg systolisch beim Aufstehen ist orthostatisch. Wichtig: Arzt-Information wegen neuer Medikation.",
          isCorrect: true,
          next: s3,
        },
        {
          text: "Werte sind unauffällig — weitermachen, Toilette ist wichtig.",
          feedback: "Ein systolischer Abfall um 35 mmHg ist klinisch relevant. Sturzrisiko stark erhöht.",
          isCorrect: false,
          next: s3,
        },
        {
          text: "Notruf 112 absetzen.",
          feedback: "Ein Notruf ist überzogen — Orthostase ist mit Lagerung und ärztlicher Rücksprache zu behandeln.",
          isCorrect: false,
          next: s3,
        },
      ],
    },
    {
      id: s3,
      description: "Frau M. liegt wieder, die Werte stabilisieren sich. Sie möchte aber dringend zur Toilette und ist deutlich gereizt: 'Lassen Sie mich doch endlich!'",
      question: "Wie reagieren Sie?",
      options: [
        {
          text: "Bedürfnis ernst nehmen: Toilettenstuhl ans Bett, alternativ mit Hilfe sicher mobilisieren, Hilfe anbieten.",
          feedback: "Richtig — Würde und Autonomie wahren, gleichzeitig sicher mobilisieren. Toilettenstuhl ist die pragmatische Lösung.",
          isCorrect: true,
          next: s4,
        },
        {
          text: "Steckbecken ins Bett, sie soll dort bleiben bis der Arzt da ist.",
          feedback: "Steckbecken ist für mobile Patient:innen oft entwürdigend. Es gibt bessere Optionen.",
          isCorrect: false,
          next: s4,
        },
        {
          text: "Sie aufstehen lassen und nichts weiter tun.",
          feedback: "Nach Kollaps-Symptomatik ohne Begleitung gehen lassen wäre fahrlässig.",
          isCorrect: false,
          next: s4,
        },
      ],
    },
    {
      id: s4,
      description: "Frau M. ist erleichtert wieder im Bett. Der Tagdienst-Arzt kommt um 09:00. Sie dokumentieren den Vorfall.",
      question: "Welche Angaben gehören zwingend in die Pflegedokumentation?",
      options: [
        {
          text: "Datum/Uhrzeit, Symptome (Schwindel, RR-Werte sitzend/stehend), Maßnahmen, Arzt-Info, ggf. Sturzrisiko-Assessment.",
          feedback: "Vollständige, sachliche, nachvollziehbare Doku — genau so.",
          isCorrect: true,
          next: s5,
        },
        {
          text: "Nur: 'Patientin schwindelig.'",
          feedback: "Zu unspezifisch. Werte, Maßnahmen, Zeiten fehlen — rechtlich nicht ausreichend.",
          isCorrect: false,
          next: s5,
        },
        {
          text: "Keine Doku nötig, war ja nur kurz.",
          feedback: "Doku-Pflicht gilt immer, besonders bei Vitalwert-Auffälligkeiten und Sturzrisiko.",
          isCorrect: false,
          next: s5,
        },
      ],
    },
    {
      id: s5,
      description: "Beim Übergabe-Gespräch nachmittags soll Frau M. einen sturzprophylaktischen Vorschlag bekommen.",
      question: "Was schlagen Sie ihr vor?",
      options: [
        {
          text: "Anti-Rutsch-Socken, Klingel in Reichweite, freie Wege, Licht, Aufstehen langsam in mehreren Schritten — und gemeinsames Üben mit der Physio.",
          feedback: "Multifaktorielles Bündel — genau wie es die Leitlinien empfehlen.",
          isCorrect: true,
          next: null,
        },
        {
          text: "Bettgitter hoch und nur noch im Bett bleiben.",
          feedback: "Freiheitsentziehende Maßnahmen brauchen rechtliche Grundlage — und Mobilisation ist langfristig wichtiger.",
          isCorrect: false,
          next: null,
        },
        {
          text: "Stärkeres Medikament gegen den Schwindel verschreiben lassen.",
          feedback: "Mehr Medikamente erhöhen das Sturzrisiko oft zusätzlich. Erst die Ursache (Antihypertensivum) prüfen.",
          isCorrect: false,
          next: null,
        },
      ],
    },
  ];

  await db.insert(schema.tasks).values({
    classId: klass.id,
    authorId: teacher.id,
    topicId: notfallTopic?.id ?? hygieneTopic?.id ?? null,
    type: "case_study",
    title: "Fallstudie: Sturzprophylaxe Frau M.",
    description: "82-jährige Patientin nach Sturzfraktur — fünf Entscheidungspunkte",
    payload: JSON.stringify({ intro, steps }),
    xpReward: 40,
    publishedAt: new Date(),
  });

  console.log(`  ✓ Fallstudie mit ${steps.length} Schritten · in Thema '${notfallTopic?.title ?? "ohne Thema"}'`);
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
