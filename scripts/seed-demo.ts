/**
 * Demo-Seed: legt einen vollständigen Demo-Datensatz an, damit Fremde
 * die App ohne Vorbereitung ausprobieren können.
 *
 * Account:    lehrer@demo.test / demo1234
 * Klassencode: DEMO01
 *
 * Idempotent: kann mehrfach laufen, ohne Doubletten anzulegen.
 *
 * Aufruf:  npm run seed:demo
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const dbPath = path.join(process.cwd(), "data", "testschule.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const DEMO_EMAIL = "lehrer@demo.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_CLASS_CODE = "DEMO01";
const DEMO_CLASS_NAME = "Pflege Demo 24";

async function main() {
  console.log("→ Demo-Seed läuft …\n");

  // 1) Demo-Schule
  let school = await db.query.schools.findFirst({
    where: eq(schema.schools.name, "Demo Pflegeschule"),
  });
  if (!school) {
    const [s] = await db.insert(schema.schools).values({ name: "Demo Pflegeschule" }).returning();
    school = s;
    console.log("✓ Schule angelegt:", s.name);
  } else {
    console.log("· Schule existiert:", school.name);
  }

  // 2) Demo-Lehrkraft
  let teacher = await db.query.users.findFirst({ where: eq(schema.users.email, DEMO_EMAIL) });
  if (!teacher) {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const [t] = await db.insert(schema.users).values({
      schoolId: school.id,
      role: "teacher",
      email: DEMO_EMAIL,
      passwordHash: hash,
      displayName: "Frau Demo",
      avatarEmoji: "👩‍⚕️",
      avatarColor: "#0ea5e9",
    }).returning();
    teacher = t;
    console.log("✓ Lehrkraft:", DEMO_EMAIL, "/", DEMO_PASSWORD);
  } else {
    console.log("· Lehrkraft existiert:", DEMO_EMAIL);
  }

  // 3) Jahrgang
  let year = await db.query.yearGroups.findFirst({
    where: eq(schema.yearGroups.schoolId, school.id),
  });
  if (!year) {
    const [y] = await db.insert(schema.yearGroups).values({
      schoolId: school.id, name: "1. Jahr", position: 1,
    }).returning();
    year = y;
    console.log("✓ Jahrgang:", y.name);
  } else {
    console.log("· Jahrgang vorhanden:", year.name);
  }

  // 4) Demo-Klasse mit festem Code
  let klass = await db.query.classes.findFirst({
    where: eq(schema.classes.inviteCode, DEMO_CLASS_CODE),
  });
  if (!klass) {
    const [c] = await db.insert(schema.classes).values({
      schoolId: school.id,
      yearGroupId: year.id,
      teacherId: teacher.id,
      name: DEMO_CLASS_NAME,
      inviteCode: DEMO_CLASS_CODE,
      color: "#0ea5e9",
    }).returning();
    klass = c;
    console.log("✓ Klasse:", c.name, "(Code:", DEMO_CLASS_CODE + ")");
  } else {
    console.log("· Klasse existiert:", klass.name);
  }

  // 5) Themen
  const topicTitles = ["Vitalwerte", "Hygiene", "Medikamentenlehre", "Anatomie"];
  for (const title of topicTitles) {
    const exists = await db.query.topics.findFirst({
      where: eq(schema.topics.title, title),
    });
    if (!exists) {
      await db.insert(schema.topics).values({
        classId: klass.id,
        title,
      });
      console.log("  ✓ Thema:", title);
    }
  }
  const topicsAll = await db.query.topics.findMany({
    where: eq(schema.topics.classId, klass.id),
  });
  const topicByTitle = Object.fromEntries(topicsAll.map((t) => [t.title, t]));

  // 6) Aufgaben — eine von jedem Typ
  const existingTasks = await db.query.tasks.findMany({
    where: eq(schema.tasks.classId, klass.id),
  });
  if (existingTasks.length === 0) {
    const baseTask = {
      classId: klass.id,
      authorId: teacher.id,
      publishedAt: new Date(),
      xpReward: 20,
    };

    // Quiz
    await db.insert(schema.tasks).values({
      ...baseTask,
      type: "quiz",
      topicId: topicByTitle["Vitalwerte"]?.id ?? null,
      title: "Vitalwerte — Grundlagen",
      description: "Kennst du die Normwerte?",
      difficulty: 1,
      payload: JSON.stringify({
        questions: [
          {
            question: "Welcher Bereich gilt als normaler Ruhepuls eines Erwachsenen?",
            options: ["40–60 bpm", "60–100 bpm", "100–140 bpm", "140–180 bpm"],
            correctIndex: 1,
            explanation: "Der Ruhepuls liegt physiologisch zwischen 60 und 100 Schlägen pro Minute.",
          },
          {
            question: "Ab welchem Blutdruckwert spricht man von Hypertonie (Erwachsene)?",
            options: ["120/80 mmHg", "130/85 mmHg", "140/90 mmHg", "160/100 mmHg"],
            correctIndex: 2,
            explanation: "Ab dauerhaft 140/90 mmHg liegt eine arterielle Hypertonie vor.",
          },
        ],
      }),
    });

    // Cloze
    await db.insert(schema.tasks).values({
      ...baseTask,
      type: "cloze",
      topicId: topicByTitle["Vitalwerte"]?.id ?? null,
      title: "Lückentext — Vitalzeichen",
      description: "Setze die richtigen Werte ein.",
      difficulty: 2,
      payload: JSON.stringify({
        text:
          "Der normale Puls in Ruhe liegt zwischen {{60}} und {{100}} Schlägen pro Minute. " +
          "Ab einem Blutdruck von {{140/90}} mmHg spricht man von einer {{Hypertonie}}.",
        blanks: [
          { index: 0, answers: ["60"], caseSensitive: false },
          { index: 1, answers: ["100"], caseSensitive: false },
          { index: 2, answers: ["140/90"], caseSensitive: false },
          { index: 3, answers: ["Hypertonie", "Bluthochdruck"], caseSensitive: false },
        ],
      }),
    });

    // Flashcards
    await db.insert(schema.tasks).values({
      ...baseTask,
      type: "flashcards",
      topicId: topicByTitle["Medikamentenlehre"]?.id ?? null,
      title: "Karteikarten — Medikamentengruppen",
      difficulty: 1,
      payload: JSON.stringify({
        cards: [
          { front: "ACE-Hemmer", back: "Senken den Blutdruck, z. B. Ramipril, Enalapril." },
          { front: "Beta-Blocker", back: "Verlangsamen den Herzschlag, z. B. Metoprolol." },
          { front: "Diuretika", back: "Entwässern den Körper, z. B. Furosemid." },
        ],
      }),
    });

    // Case Study
    await db.insert(schema.tasks).values({
      ...baseTask,
      type: "case_study",
      topicId: topicByTitle["Anatomie"]?.id ?? null,
      title: "Fall — Frau Schmidt (78) mit Atemnot",
      difficulty: 3,
      payload: JSON.stringify({
        situation:
          "Frau Schmidt, 78, wirkt nach dem Frühstück blass und kurzatmig. Sie sitzt aufrecht im Bett und klagt über Druck in der Brust. " +
          "Sie hat eine bekannte Herzinsuffizienz und nimmt täglich Furosemid.",
        questions: [
          {
            question: "Welche Vitalzeichen würdest du als erstes erheben und warum?",
            sampleAnswer:
              "Atemfrequenz, SpO2, Puls und Blutdruck — um eine Linksherzinsuffizienz-Dekompensation früh zu erkennen und Hypoxie auszuschließen.",
          },
          {
            question: "Welche Lagerung ist angemessen?",
            sampleAnswer: "Oberkörperhochlagerung, ggf. herzentlastende Position, Beine tief — entlastet das Herz und erleichtert die Atmung.",
          },
        ],
      }),
    });

    // Image Hotspot
    await db.insert(schema.tasks).values({
      ...baseTask,
      type: "image_hotspot",
      topicId: topicByTitle["Hygiene"]?.id ?? null,
      title: "Bildhotspot — 5 Momente der Händehygiene",
      difficulty: 2,
      payload: JSON.stringify({
        imageUrl: "https://placehold.co/600x400/0ea5e9/ffffff?text=H%C3%A4ndehygiene+Beispiel",
        hotspots: [
          { x: 0.2, y: 0.3, label: "Vor Patientenkontakt", correct: true },
          { x: 0.5, y: 0.5, label: "Nach Kontakt mit Körperflüssigkeiten", correct: true },
          { x: 0.8, y: 0.7, label: "Vor dem Mittagessen", correct: false },
        ],
      }),
    });
    console.log("✓ 5 Beispielaufgaben angelegt (je 1 Typ)");
  } else {
    console.log("· Aufgaben vorhanden:", existingTasks.length);
  }

  // 7) Stundenplan-Slots
  const existingSlots = await db.query.scheduleSlots.findMany({
    where: eq(schema.scheduleSlots.classId, klass.id),
  });
  if (existingSlots.length === 0) {
    const slots = [
      { weekday: 0, startTime: "08:00", endTime: "09:30", title: "Pflegegrundlagen" },
      { weekday: 0, startTime: "10:00", endTime: "11:30", title: "Anatomie" },
      { weekday: 2, startTime: "08:00", endTime: "09:30", title: "Hygiene & Infektionsschutz" },
      { weekday: 4, startTime: "09:00", endTime: "10:30", title: "Medikamentenlehre" },
    ];
    for (const s of slots) {
      await db.insert(schema.scheduleSlots).values({ classId: klass.id, ...s });
    }
    console.log("✓ Stundenplan angelegt (4 Slots)");
  } else {
    console.log("· Stundenplan vorhanden");
  }

  // 8) Lernpfad mit Auto-Verteilung
  const existingPaths = await db.query.learningPaths.findMany({
    where: eq(schema.learningPaths.classId, klass.id),
  });
  if (existingPaths.length === 0) {
    // Montag der aktuellen Woche
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    today.setDate(today.getDate() - dow);
    const startsOn = today.toISOString().slice(0, 10);

    const [pathRow] = await db.insert(schema.learningPaths).values({
      classId: klass.id,
      name: "Pflegegrundlagen — 4 Wochen Einstieg",
      description: "Strukturierter Einstieg mit Vitalwerten, Hygiene, Medikamenten und einem Fallbeispiel.",
      startsOn,
      numWeeks: 4,
      createdBy: teacher.id,
    }).returning();

    // Verteile vorhandene Aufgaben rund über die Wochen
    const allTasks = await db.query.tasks.findMany({
      where: eq(schema.tasks.classId, klass.id),
    });
    let week = 1;
    let order = 0;
    for (const t of allTasks) {
      await db.insert(schema.learningPathItems).values({
        pathId: pathRow.id,
        weekIndex: week,
        taskId: t.id,
        order: order++,
      });
      week = (week % 4) + 1;
    }
    console.log("✓ Lernpfad „" + pathRow.name + "\" mit", allTasks.length, "Aufgaben angelegt");
  } else {
    console.log("· Lernpfad vorhanden");
  }

  // 9) Inhalt-Bibliothek
  const existingContent = await db.query.contentItems.findMany({
    where: eq(schema.contentItems.ownerId, teacher.id),
  });
  if (existingContent.length === 0) {
    await db.insert(schema.contentItems).values([
      {
        schoolId: school.id,
        ownerId: teacher.id,
        topicId: topicByTitle["Vitalwerte"]?.id ?? null,
        type: "text",
        title: "Spickzettel — Normwerte",
        body: "# Vitalwerte – Schnellübersicht\n\n- **Puls (Ruhe, Erwachsene):** 60–100 bpm\n- **Blutdruck:** ideal 120/80, Hypertonie ab 140/90\n- **Atemfrequenz:** 12–20 / min\n- **SpO₂:** ≥ 96 % (Normalbereich)\n- **Temperatur:** 36,3–37,4 °C\n",
      },
      {
        schoolId: school.id,
        ownerId: teacher.id,
        topicId: topicByTitle["Hygiene"]?.id ?? null,
        type: "text",
        title: "5 Momente der Händehygiene (WHO)",
        body: "1. **Vor** Patientenkontakt\n2. **Vor** aseptischer Tätigkeit\n3. **Nach** Kontakt mit potenziell infektiösem Material\n4. **Nach** Patientenkontakt\n5. **Nach** Kontakt mit der unmittelbaren Patientenumgebung\n",
      },
    ]);
    console.log("✓ Bibliothek mit 2 Lerntexten gefüllt");
  } else {
    console.log("· Bibliothek vorhanden");
  }

  console.log("\n=========================================");
  console.log("  Demo bereit!");
  console.log("=========================================");
  console.log("Lehrkraft:");
  console.log("  E-Mail:   " + DEMO_EMAIL);
  console.log("  Passwort: " + DEMO_PASSWORD);
  console.log("");
  console.log("Schüler:in:");
  console.log("  Klassencode: " + DEMO_CLASS_CODE);
  console.log("  Name + selbstgewählte PIN");
  console.log("=========================================\n");

  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
