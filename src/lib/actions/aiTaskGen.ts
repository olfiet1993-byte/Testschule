"use server";

import { auth } from "@/lib/auth";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { logTokenUsage, scrubPrompt } from "@/lib/ai/tokenLogger";

type TaskType = "quiz" | "cloze" | "flashcards" | "case_study";

function parseClaudeJson(text: string): any {
  let jsonText = text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("Modell-Antwort war kein gültiges JSON. Versuch's nochmal oder formulier präziser.");
  }
}

async function postClaude(
  body: any,
  meta?: { callType?: string; classId?: string | null }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Kein ANTHROPIC_API_KEY in .env.local. Lege die Variable an (claude.com/settings/keys), starte den Server neu und versuch es nochmal."
    );
  }
  const model = body.model ?? "claude-haiku-4-5-20251001";
  const startTime = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, ...body }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude-API-Fehler: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const durationMs = Date.now() - startTime;
  // Token-Logging fire-and-forget (blockiert nie den Request)
  const inputTokens  = data?.usage?.input_tokens  ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;
  if (inputTokens > 0 || outputTokens > 0) {
    import("@/lib/auth").then(({ auth }) =>
      auth().then((session) => {
        const teacherId = (session?.user as any)?.id;
        if (teacherId) logTokenUsage({ teacherId, callType: meta?.callType ?? "unknown", model, inputTokens, outputTokens, classId: meta?.classId ?? null, durationMs });
      })
    );
  }
  return data?.content?.[0]?.text ?? "";
}

async function callClaude(
  prompt: string,
  maxTokens = 2000,
  meta?: { callType?: string; classId?: string | null }
): Promise<any> {
  const { text: cleanPrompt } = scrubPrompt(prompt);
  const text = await postClaude({ max_tokens: maxTokens, messages: [{ role: "user", content: cleanPrompt }] }, meta);
  return parseClaudeJson(text);
}

/**
 * Sendet einen Vision-Request mit einem lokalen Bild aus /public/uploads.
 * Erwartet imagePath im DB-Format (z. B. "/uploads/abc.jpg").
 */
async function callClaudeWithImage(prompt: string, imagePath: string, maxTokens = 2500): Promise<any> {
  if (!imagePath.startsWith("/uploads/")) throw new Error("Ungültiger Bildpfad");
  const filename = imagePath.replace(/^\/uploads\//, "");
  if (filename.includes("..") || filename.includes("/")) throw new Error("Ungültiger Bildpfad");
  const fullPath = path.join(process.cwd(), "public", "uploads", filename);
  const buf = await readFile(fullPath);
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mediaType =
    ext === "png" ? "image/png" :
    ext === "gif" ? "image/gif" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";
  const base64 = buf.toString("base64");
  const text = await postClaude({
    max_tokens: maxTokens,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt },
      ],
    }],
  });
  return parseClaudeJson(text);
}

const PROMPTS: Record<TaskType, (topic: string, count: number, difficulty: string) => string> = {
  quiz: (topic, count, diff) => `Erstelle ${count} Multiple-Choice-Fragen für die Pflegeausbildung zum Thema "${topic}".
Schwierigkeit: ${diff}.
Antwortformat: STRICT JSON, NUR JSON, KEIN Markdown, KEINE Erklärung außerhalb des JSON:
{"questions":[{"question":"…","options":["A","B","C","D"],"correctIndex":0,"explanation":"…"}]}
Wichtig: exakt 4 Optionen pro Frage, correctIndex 0–3, prägnante deutsche Erklärung.`,

  cloze: (topic, count, diff) => `Erstelle einen Lückentext mit ${count} Lücken für die Pflegeausbildung zum Thema "${topic}".
Schwierigkeit: ${diff}.
Markiere Lücken im Text als {{Antwort}}.
Antwortformat: STRICT JSON, NUR JSON:
{"text":"Vollständiger Text mit {{Lücken}} markiert.","blanks":[{"index":0,"answers":["Hauptantwort","Synonym"],"caseSensitive":false}]}`,

  flashcards: (topic, count, diff) => `Erstelle ${count} Karteikarten (Vorder-/Rückseite) für die Pflegeausbildung zum Thema "${topic}".
Schwierigkeit: ${diff}.
Antwortformat: STRICT JSON, NUR JSON:
{"cards":[{"front":"Begriff oder kurze Frage","back":"Erklärung in 1–2 Sätzen"}]}`,

  case_study: (topic, _count, diff) => `Erstelle ein realistisches Pflege-Fallbeispiel zum Thema "${topic}".
Schwierigkeit: ${diff}.
Antwortformat: STRICT JSON, NUR JSON:
{"situation":"Beschreibung Patient + Situation, 3–5 Sätze","questions":[{"question":"…","sampleAnswer":"Musterantwort"}]}
Bitte 3 Fragen erstellen.`,
};

export async function generateTaskWithAI(input: {
  type: TaskType;
  topic: string;
  count?: number;
  difficulty?: "leicht" | "mittel" | "schwer";
}): Promise<any> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.topic.trim()) throw new Error("Thema fehlt");
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const diff = input.difficulty ?? "mittel";
  return await callClaude(PROMPTS[input.type](input.topic.trim(), count, diff), 2000, { callType: "quiz_generate" });
}

/**
 * Erzeugt eine Aufgabe aus einem vorhandenen Bibliotheks-Text.
 * Im Unterschied zu generateTaskWithAI wird der Quelltext als Kontext injiziert,
 * sodass die KI direkt auf dem Inhalt arbeitet (statt nur Thema).
 */
export async function deriveTaskFromContent(input: {
  type: TaskType;
  contentTitle: string;
  contentBody: string;
  count?: number;
}): Promise<any> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.contentBody.trim()) throw new Error("Quelltext ist leer");
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const basePrompt = PROMPTS[input.type](input.contentTitle.trim() || "Lerninhalt", count, "mittel");
  const prompt = `Du sollst die unten stehende Aufgabe NUR auf Basis dieses Lerntextes erzeugen:

==== LERNTEXT START ====
${input.contentBody.trim()}
==== LERNTEXT ENDE ====

${basePrompt}

WICHTIG: Verwende ausschließlich Informationen, die im Lerntext stehen. Keine Halluzinationen.`;
  return await callClaude(prompt, 2500, { callType: "task_derive" });
}

/**
 * Generiert plausible Falsch-Antworten (Distraktoren) für eine Quiz-Frage.
 */
export async function generateDistractors(input: {
  question: string;
  correctAnswer: string;
  existing?: string[];
  count?: number;
}): Promise<{ distractors: string[] }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.question.trim() || !input.correctAnswer.trim()) {
    throw new Error("Frage und richtige Antwort werden benötigt");
  }
  const n = Math.min(Math.max(input.count ?? 3, 1), 5);
  const existing = (input.existing ?? []).map((s) => s.trim()).filter(Boolean);
  const prompt = `Du erstellst plausible aber falsche Antwortmöglichkeiten (Distraktoren) für eine Multiple-Choice-Frage in der Pflegeausbildung.

Frage: "${input.question.trim()}"
Richtige Antwort: "${input.correctAnswer.trim()}"
${existing.length ? `Bereits vorhandene Optionen (nicht doppeln): ${JSON.stringify(existing)}` : ""}

Erzeuge ${n} plausibel klingende, aber EINDEUTIG falsche Antworten. Sie sollen für jemanden, der das Thema nicht sicher kennt, denkbar wirken — aber bei richtiger Kenntnis klar als falsch erkennbar sein.

Antwortformat: STRICT JSON, NUR JSON:
{"distractors":["…","…","…"]}`;
  return await callClaude(prompt, 800, { callType: "distractors" });
}

/**
 * Erzeugt eine pädagogische 1-2-Satz-Erklärung für eine Quiz-Frage.
 */
export async function generateExplanation(input: {
  question: string;
  correctAnswer: string;
  context?: string;
}): Promise<{ explanation: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.question.trim() || !input.correctAnswer.trim()) {
    throw new Error("Frage und richtige Antwort werden benötigt");
  }
  const prompt = `Schreibe eine kurze (1-2 Sätze, max. 200 Zeichen) pädagogische Erklärung für diese Pflege-Quizfrage. Die Erklärung wird Schüler:innen nach der Abgabe gezeigt und soll WARUM die Antwort richtig ist begründen.

Frage: "${input.question.trim()}"
Richtige Antwort: "${input.correctAnswer.trim()}"
${input.context ? `Zusätzlicher Kontext: ${input.context.trim()}` : ""}

Antwortformat: STRICT JSON, NUR JSON:
{"explanation":"…"}

Stil: sachlich, prägnant, ohne Anreden („Sehr gut!" o. ä. weglassen).`;
  return await callClaude(prompt, 500, { callType: "explanation" });
}

/**
 * Erzeugt eine Aufgabe basierend auf einem Bibliotheks-Bild.
 * Sendet das Bild an Claude (Vision) und lässt Aufgaben aus dem sichtbaren Inhalt ableiten.
 */
export async function deriveTaskFromImage(input: {
  type: TaskType;
  contentTitle: string;
  imagePath: string;
  description?: string;
  count?: number;
}): Promise<any> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.imagePath) throw new Error("Bildpfad fehlt");
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const basePrompt = PROMPTS[input.type](input.contentTitle.trim() || "das Bild", count, "mittel");
  const prompt = `Sieh dir das beigefügte Bild genau an. Es ist Teil einer Pflege-Lerneinheit.
${input.description ? `Kontext / Beschreibung: ${input.description.trim()}` : ""}

${basePrompt}

WICHTIG:
- Stütze die Aufgabe NUR auf das, was im Bild zu sehen ist (oder unmittelbar daraus hervorgeht)
- Keine externen Halluzinationen — wenn etwas nicht klar erkennbar ist, frag stattdessen Beobachtungen ab
- Nenne im Aufgabentext keine technischen Bilddetails ("oben links sieht man…") — formulier inhaltlich`;
  return await callClaudeWithImage(prompt, input.imagePath, 2500);
}

/**
 * Erzeugt eine Aufgabe aus einem Link/Video-Eintrag. Da wir die URL nicht
 * abrufen, nutzen wir Titel + Beschreibung + URL als Kontext.
 */
export async function deriveTaskFromLink(input: {
  type: TaskType;
  contentTitle: string;
  url: string;
  description?: string;
  count?: number;
}): Promise<any> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.url) throw new Error("URL fehlt");
  if (!input.description?.trim() && !input.contentTitle.trim()) {
    throw new Error("Mindestens Titel oder Beschreibung des Links nötig — die KI sieht den Link-Inhalt nicht.");
  }
  const count = Math.min(Math.max(input.count ?? 5, 1), 10);
  const basePrompt = PROMPTS[input.type](input.contentTitle.trim() || "der verlinkten Ressource", count, "mittel");
  const prompt = `Du erstellst eine Aufgabe zu einer extern verlinkten Quelle (du siehst den Link-Inhalt NICHT — nur die Beschreibung der Lehrkraft).

Titel: "${input.contentTitle.trim() || "(ohne Titel)"}"
URL (als Hinweis auf Thema/Quelle): ${input.url}
${input.description ? `Beschreibung der Lehrkraft: ${input.description.trim()}` : ""}

${basePrompt}

WICHTIG:
- Arbeite ausschließlich mit der vorhandenen Beschreibung + dem im Titel/URL erkennbaren Themengebiet
- Wenn die Beschreibung dünn ist, formuliere allgemeinere Pflege-Fragen rund um das Thema
- Keine konkreten Zahlen/Zitate aus dem nicht-bekannten Link-Inhalt erfinden`;
  return await callClaude(prompt, 2500);
}

/**
 * Schlägt für eine Cloze-Lücke Synonyme/Alternative akzeptierte Antworten vor.
 */
export async function generateClozeAlternatives(input: {
  sentence: string;
  primaryAnswer: string;
  existing?: string[];
  count?: number;
}): Promise<{ alternatives: string[] }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.primaryAnswer.trim()) throw new Error("Hauptantwort fehlt");
  const n = Math.min(Math.max(input.count ?? 3, 1), 5);
  const existing = (input.existing ?? []).map((s) => s.trim()).filter(Boolean);
  const prompt = `Für einen Lückentext in der Pflegeausbildung sollst du Synonyme oder alternative korrekte Schreibweisen vorschlagen, die als richtige Antwort gelten sollen.

Satz mit Lücke: "${input.sentence.trim()}"
Hauptantwort: "${input.primaryAnswer.trim()}"
${existing.length ? `Bereits akzeptiert: ${JSON.stringify(existing)}` : ""}

Erzeuge bis zu ${n} sinnvolle Alternativen. Beispiele:
- Englisch ↔ deutsch (z. B. "Hypertonie" / "Bluthochdruck")
- Abkürzung ↔ ausgeschrieben (z. B. "i.v." / "intravenös")
- Mit/ohne Einheit (z. B. "60 bpm" / "60")
- Akzeptierte Tippfehler/Großschreibung

Antwortformat: STRICT JSON, NUR JSON:
{"alternatives":["…","…"]}`;
  return await callClaude(prompt, 500, { callType: "cloze_alt" });
}

/**
 * Schlägt für einen Case-Study-Schritt 2-3 Antwort-Optionen mit Feedback vor (1 richtig, restlich plausibel falsch).
 */
export async function generateCaseOptions(input: {
  caseIntro: string;
  stepQuestion: string;
  existingOptions?: { text: string; isCorrect: boolean }[];
}): Promise<{ options: { text: string; feedback: string; isCorrect: boolean }[] }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.stepQuestion.trim()) throw new Error("Frage fehlt");
  const existing = (input.existingOptions ?? []).filter((o) => o.text?.trim());
  const prompt = `Für eine Pflege-Fallstudie sollst du Antwort-Optionen für einen Entscheidungsschritt erzeugen.

Fall-Setup: ${input.caseIntro.trim() || "(kein Kontext angegeben)"}

Schritt-Frage: "${input.stepQuestion.trim()}"
${existing.length ? `Bereits vorhandene Optionen: ${JSON.stringify(existing)}` : ""}

Erzeuge genau 3 Optionen: 1 richtige + 2 plausible falsche. Jede Option soll ein kurzes Feedback (1 Satz) haben — was passiert/was ist daran richtig oder falsch.

Antwortformat: STRICT JSON, NUR JSON:
{"options":[{"text":"…","feedback":"…","isCorrect":true},{"text":"…","feedback":"…","isCorrect":false},{"text":"…","feedback":"…","isCorrect":false}]}`;
  return await callClaude(prompt, 1200, { callType: "case_options" });
}

/**
 * Schlägt aus dem verfügbaren Curriculum die best-passende Unit für eine Aufgabe vor.
 */
export async function suggestCurriculumUnit(input: {
  title: string;
  description?: string;
  units: { id: string; code?: string | null; title: string }[];
}): Promise<{ unitId: string | null; reason: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.title.trim()) throw new Error("Titel fehlt");
  if (!input.units || input.units.length === 0) return { unitId: null, reason: "Keine Lehrplan-Einträge vorhanden" };

  const unitList = input.units
    .filter((u) => u.code) // nur die mit Code (Lernfelder)
    .map((u) => `${u.code} — ${u.title} [id:${u.id}]`)
    .join("\n");

  const prompt = `Du sollst die passendste Lehrplan-Einheit für eine Pflege-Aufgabe vorschlagen.

Aufgabe:
- Titel: "${input.title.trim()}"
${input.description ? `- Beschreibung: "${input.description.trim()}"` : ""}

Verfügbare Lehrplan-Einheiten (Code — Titel [id]):
${unitList}

Wähle die passendste Einheit aus. Antwortformat STRICT JSON, NUR JSON:
{"unitId":"<die id aus eckigen klammern>","reason":"<1 Satz Begründung>"}

Falls keine wirklich passt, gib unitId: null zurück.`;
  return await callClaude(prompt, 400, { callType: "curriculum_suggest" });
}

/**
 * Extrahiert aus einem Lerntext eine Liste von Fachbegriffen + Definitionen.
 */
export async function extractGlossary(input: {
  title: string;
  body: string;
  count?: number;
}): Promise<{ terms: { term: string; definition: string }[] }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.body.trim()) throw new Error("Quelltext fehlt");
  const n = Math.min(Math.max(input.count ?? 10, 3), 20);
  const prompt = `Extrahiere aus dem folgenden Pflege-Lerntext bis zu ${n} zentrale Fachbegriffe mit prägnanter Definition (1 Satz).

==== LERNTEXT (Titel: "${input.title.trim()}") ====
${input.body.trim()}
==== ENDE ====

Wichtig:
- Nur Begriffe, die wirklich im Text vorkommen oder unmittelbar daraus hergeleitet werden können
- Definition in 1 Satz, max. 200 Zeichen
- Sortiert nach Relevanz im Text

Antwortformat: STRICT JSON, NUR JSON:
{"terms":[{"term":"…","definition":"…"}]}`;
  return await callClaude(prompt, 2000, { callType: "glossary" });
}

export async function generateVitalScenarioWithAI(input: {
  topic: string;
  difficulty?: "leicht" | "mittel" | "schwer";
}): Promise<any> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!input.topic.trim()) throw new Error("Thema fehlt");
  const diff = input.difficulty ?? "mittel";
  const prompt = `Erstelle einen realistischen Pflege-Notfall- oder Pflegesituation für einen Vitalwerte-Simulator zum Thema "${input.topic.trim()}".
Schwierigkeit: ${diff}.

Antwortformat: STRICT JSON, NUR JSON, KEINE Erklärung außerhalb des JSON:
{
  "patientName": "z. B. Frau Schmidt",
  "age": 67,
  "context": "2-4 Sätze: Vorgeschichte, akute Symptome, Auffälligkeiten.",
  "vitals": {
    "pulse": 110,
    "systolic": 90,
    "diastolic": 55,
    "respRate": 28,
    "spo2": 92,
    "tempC": 37.8,
    "consciousness": "verwirrt"
  },
  "abnormal": ["pulse","systolic","respRate","spo2","consciousness"],
  "diagnosis": "Verdachts- oder Arbeitsdiagnose, kurz",
  "correctActions": [
    "3-5 pflegerische Maßnahmen (sortiert nach Priorität, was zuerst tun?)"
  ],
  "distractorActions": [
    "2-3 falsche oder unpassende Optionen, plausibel klingend"
  ]
}

WICHTIG:
- consciousness MUSS einer dieser Werte sein: "alert", "verwirrt", "somnolent", "bewusstlos"
- abnormal-Liste enthält nur die Vital-Keys, die wirklich auffällig sind (Werte außerhalb Norm)
- Norm-Bereiche: Puls 60-100, RR 100-140/60-90, AF 12-20, SpO2 >=95, Temp 36-37.5, consciousness=alert
- pulse, systolic, diastolic, respRate, spo2 = ganze Zahlen
- tempC = Dezimalzahl (z. B. 37.5)`;
  return await callClaude(prompt, 1500, { callType: "vital" });
}
