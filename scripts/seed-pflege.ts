/**
 * Pflege-Beispielinhalte: Geringe Schwierigkeit, Pflegegrundlagen
 * Quellen: AWMF-Leitlinien, BzgA, Lehrbuch-Standard. Inhalte didaktisch vereinfacht.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "../src/db/schema";

const sqlite = new Database(path.join(process.cwd(), "data", "testschule.db"));
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function main() {
  const school = await db.query.schools.findFirst();
  if (!school) throw new Error("Erst seed.ts laufen lassen");
  const teacher = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.role, "teacher"),
  });
  if (!teacher) throw new Error("Kein Lehrer-Account");
  const klass = await db.query.classes.findFirst();
  if (!klass) throw new Error("Keine Klasse");

  const existing = await db.query.contentItems.findFirst();
  if (existing) {
    console.log("· Bibliothek hat schon Einträge — überspringe Beispiel-Inhalte.");
  } else {
    console.log("→ Pflege-Inhalte für die Bibliothek anlegen…");

    const items = [
      // Begriffe (Karteikarten-Basis)
      { type: "term", title: "Dekubitus", body: "Lokale Schädigung der Haut und des darunterliegenden Gewebes durch andauernden Druck. Häufig an Knochenvorsprüngen (Steiß, Ferse).", tags: "Hygiene,Wundversorgung,Lagerung" },
      { type: "term", title: "Hypertonie", body: "Bluthochdruck — anhaltend erhöhter Blutdruck ab 140/90 mmHg.", tags: "Vitalwerte,HKL" },
      { type: "term", title: "Tachykardie", body: "Beschleunigter Herzschlag über 100 Schläge pro Minute beim Erwachsenen in Ruhe.", tags: "Vitalwerte,HKL" },
      { type: "term", title: "Bradykardie", body: "Verlangsamter Herzschlag unter 60 Schläge pro Minute beim Erwachsenen.", tags: "Vitalwerte,HKL" },
      { type: "term", title: "Asepsis", body: "Zustand der Keimfreiheit — Maßnahmen, um Kontamination durch Mikroorganismen zu verhindern.", tags: "Hygiene" },
      { type: "term", title: "Antisepsis", body: "Maßnahmen zur Verminderung lebender Keime auf Haut, Schleimhaut oder Wunde.", tags: "Hygiene,Wundversorgung" },
      { type: "term", title: "Apoplex", body: "Schlaganfall — plötzliche Durchblutungsstörung im Gehirn, entweder durch Verschluss (ischämisch) oder Blutung (hämorrhagisch).", tags: "Notfall,Neurologie" },
      { type: "term", title: "Pneumonie", body: "Lungenentzündung — Infektion des Lungengewebes, meist durch Bakterien oder Viren.", tags: "Atmung,Infektion" },
      { type: "term", title: "Sturzprophylaxe", body: "Maßnahmen zur Vermeidung von Stürzen: rutschfeste Schuhe, freie Wege, ausreichend Licht, Mobilisationshilfen.", tags: "Prophylaxe,Mobilisation" },
      { type: "term", title: "Pneumonieprophylaxe", body: "Maßnahmen wie Atemübungen, Frühmobilisation, Mundpflege und Lagerung zur Vorbeugung von Lungenentzündungen.", tags: "Prophylaxe,Atmung" },

      // Texte (Wissensbausteine)
      { type: "text", title: "Vitalwerte – Normbereiche Erwachsene", body: "Blutdruck: 120/80 mmHg (Soll). Hypertonie ab 140/90. Puls: 60–100/min in Ruhe. Atemfrequenz: 12–20/min. Körpertemperatur axillär: 36,3–37,4 °C. Sauerstoffsättigung: 95–100 %.", tags: "Vitalwerte,Norm" },
      { type: "text", title: "Hände-Desinfektion: 5 Indikationen (WHO)", body: "1. Vor Patientenkontakt. 2. Vor aseptischer Tätigkeit. 3. Nach Kontakt mit potentiell infektiösem Material. 4. Nach Patientenkontakt. 5. Nach Kontakt mit der Patientenumgebung.", tags: "Hygiene,Standard" },
      { type: "text", title: "Lagerung – 30°-Schräglage", body: "Wird zur Dekubitusprophylaxe eingesetzt. Patient wird seitlich um 30° geneigt — entlastet Steiß und Trochanter ohne neue Druckstellen am Knöchel zu schaffen. Wechsel alle 2 Stunden.", tags: "Lagerung,Prophylaxe,Dekubitus" },
      { type: "text", title: "Sturzrisiko-Skala (vereinfacht)", body: "Risikofaktoren prüfen: 1. Frühere Stürze, 2. Beeinträchtigte Mobilität, 3. Medikamente (Sedativa, Antihypertonika), 4. Sehprobleme, 5. Verwirrtheit. Ab 2 Faktoren: erhöhtes Risiko, Maßnahmen einleiten.", tags: "Assessment,Sturz,Prophylaxe" },
      { type: "text", title: "BMI-Berechnung & Bewertung", body: "BMI = Gewicht (kg) ÷ Körpergröße (m)². Untergewicht < 18,5 · Normal 18,5–24,9 · Übergewicht 25–29,9 · Adipositas ≥ 30.", tags: "Assessment,Ernährung" },
      { type: "text", title: "Schmerzeinschätzung – NRS", body: "Numeric Rating Scale: Patient gibt Schmerz auf Skala 0 (keine Schmerzen) bis 10 (stärkster vorstellbarer Schmerz) an. Ab Wert 4 wird üblicherweise behandelt.", tags: "Schmerz,Assessment" },

      // Links zu offiziellen Quellen
      { type: "link", title: "AWMF-Leitlinie Dekubitusprophylaxe", url: "https://www.awmf.org/leitlinien", body: "Offizielle medizinische Leitlinie zur Dekubitusprävention", tags: "Leitlinie,Dekubitus" },
      { type: "link", title: "RKI – Hygiene-Empfehlungen", url: "https://www.rki.de/DE/Themen/Infektionskrankheiten/Krankenhaushygiene/krankenhaushygiene.html", body: "Robert-Koch-Institut: aktuelle Hygiene-Standards", tags: "Hygiene,RKI" },
      { type: "link", title: "BzgA Pflegeinformationen", url: "https://www.pflege.de", body: "Patienten- und Pflegeinformationsportal", tags: "Patienteninfo" },
    ];

    for (const item of items) {
      await db.insert(schema.contentItems).values({
        schoolId: school.id,
        ownerId: teacher.id,
        type: item.type as any,
        title: item.title,
        body: item.body ?? null,
        url: (item as any).url ?? null,
        tags: item.tags,
      });
    }
    console.log(`  ✓ ${items.length} Bibliotheks-Einträge`);
  }

  // Beispiel-Quiz anlegen, falls noch keines existiert
  const existingTask = await db.query.tasks.findFirst();
  if (existingTask) {
    console.log("· Aufgaben existieren bereits — überspringe Beispiel-Quiz.");
  } else {
    console.log("→ Beispiel-Quiz anlegen…");

    const quiz1 = {
      questions: [
        {
          question: "Welcher Pulswert wird beim Erwachsenen als Tachykardie bezeichnet?",
          options: ["Über 100/min", "Über 60/min", "Über 80/min", "Über 120/min"],
          correctIndex: 0,
          explanation: "Tachykardie = Herzfrequenz > 100/min in Ruhe beim Erwachsenen.",
        },
        {
          question: "Wie ist der Soll-Blutdruck eines gesunden Erwachsenen?",
          options: ["140/90 mmHg", "120/80 mmHg", "100/60 mmHg", "160/100 mmHg"],
          correctIndex: 1,
          explanation: "120/80 mmHg gilt als optimaler Blutdruck. Ab 140/90 spricht man von Hypertonie.",
        },
        {
          question: "Was zählt NICHT zu den 5 Momenten der Händedesinfektion (WHO)?",
          options: [
            "Vor Patientenkontakt",
            "Nach Patientenkontakt",
            "Vor dem Verlassen des Krankenhauses",
            "Vor aseptischer Tätigkeit",
          ],
          correctIndex: 2,
          explanation: "Die 5 Momente sind: vor/nach Patientenkontakt, vor aseptischer Tätigkeit, nach Kontakt mit potentiell infektiösem Material, nach Kontakt mit der Patientenumgebung.",
        },
        {
          question: "In welchem Zeitabstand wird bei dekubitusgefährdeten Patienten die Lagerung gewechselt?",
          options: ["Alle 30 Minuten", "Alle 2 Stunden", "Alle 4 Stunden", "Einmal pro Schicht"],
          correctIndex: 1,
          explanation: "Standard: alle 2 Stunden. Bei hohem Risiko ggf. häufiger, individuell anpassen.",
        },
        {
          question: "Was bedeutet die Abkürzung 'NRS' in der Schmerzerfassung?",
          options: [
            "Notfall-Reanimations-Schema",
            "Numeric Rating Scale",
            "Neuro-Reflex-Score",
            "Niedrig-Risiko-Skala",
          ],
          correctIndex: 1,
          explanation: "NRS = Numeric Rating Scale: Patient gibt Schmerz auf Skala 0–10 an.",
        },
        {
          question: "Welche Atemfrequenz gilt beim Erwachsenen in Ruhe als normal?",
          options: ["6–10/min", "12–20/min", "20–30/min", "30–40/min"],
          correctIndex: 1,
          explanation: "Normale Atemfrequenz: 12–20 Atemzüge pro Minute in Ruhe.",
        },
      ],
    };

    const quiz2 = {
      questions: [
        {
          question: "Wofür steht die Abkürzung BMI?",
          options: ["Body Movement Index", "Body Mass Index", "Basic Medical Indicator", "Blood-Mass Ratio"],
          correctIndex: 1,
          explanation: "BMI = Body Mass Index, ein Maßzahl zur Bewertung des Körpergewichts.",
        },
        {
          question: "Ein Patient mit BMI 32 fällt in welche Kategorie?",
          options: ["Normalgewicht", "Übergewicht", "Adipositas", "Untergewicht"],
          correctIndex: 2,
          explanation: "Ab BMI 30 spricht man von Adipositas.",
        },
        {
          question: "Welche Maßnahme gehört zur Pneumonieprophylaxe?",
          options: [
            "Bettruhe verordnen",
            "Atemübungen anleiten",
            "Bauchlage strikt vermeiden",
            "Trinkmenge reduzieren",
          ],
          correctIndex: 1,
          explanation: "Atemübungen und Frühmobilisation sind zentrale Maßnahmen zur Pneumonieprophylaxe.",
        },
        {
          question: "Was bedeutet Apoplex?",
          options: ["Herzinfarkt", "Schlaganfall", "Lungenembolie", "Nierenversagen"],
          correctIndex: 1,
          explanation: "Apoplex ist der medizinische Begriff für Schlaganfall.",
        },
        {
          question: "Welcher Wert wird bei der Sauerstoffsättigung (SpO₂) als normal angesehen?",
          options: ["75–80%", "85–90%", "95–100%", "100–105%"],
          correctIndex: 2,
          explanation: "Normale SpO₂ liegt bei 95–100 %. Werte unter 90 % gelten als kritisch.",
        },
      ],
    };

    const [t1] = await db.insert(schema.tasks).values({
      classId: klass.id,
      authorId: teacher.id,
      type: "quiz",
      title: "Vitalwerte & Grundlagen",
      description: "Einstiegs-Quiz: Pulsbereiche, Blutdruck, Hände-Desinfektion",
      payload: JSON.stringify(quiz1),
      xpReward: 30,
      publishedAt: new Date(),
    }).returning();
    const [t2] = await db.insert(schema.tasks).values({
      classId: klass.id,
      authorId: teacher.id,
      type: "quiz",
      title: "Pflege-ABC: Fachbegriffe",
      description: "Wichtige Fachbegriffe und ihre Bedeutung",
      payload: JSON.stringify(quiz2),
      xpReward: 25,
      publishedAt: new Date(),
    }).returning();

    console.log(`  ✓ Quiz 1: ${t1.title}`);
    console.log(`  ✓ Quiz 2: ${t2.title}`);
  }

  console.log("\n✓ Pflege-Beispieldaten bereit.");
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
