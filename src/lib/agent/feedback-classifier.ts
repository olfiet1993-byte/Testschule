/**
 * Feedback-Klassifikator
 *
 * Klassifiziert eingehende Nutzer-Feedbacks mit Claude Haiku:
 * - 'bug'     → konkreter Fehler, etwas funktioniert nicht
 * - 'feature' → neue Anforderung / Verbesserungswunsch
 * - 'noise'   → unklar, zu allgemein, kein Handlungsbedarf
 *
 * Bei 'bug' mit Confidence ≥ 0.7: automatisch in agent_tasks Queue.
 * Bei 'feature': Admin muss bestätigen.
 */

import { db } from "@/db";
import { feedback, agentTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { scrubPrompt } from "@/lib/ai/tokenLogger";

type Classification = "bug" | "feature" | "noise";

interface ClassifyResult {
  classification: Classification;
  confidence: number;   // 0–1
  reasoning: string;
}

const AUTO_BUG_THRESHOLD = 0.7;

// ─── KI-Klassifikation ────────────────────────────────────────────────────────

async function classifyWithClaude(title: string, body: string): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt");

  const { text: cleanTitle } = scrubPrompt(title);
  const { text: cleanBody } = scrubPrompt(body);

  const prompt = `Du bist ein Triage-System für eine Schul-Lernplattform (Pflegeausbildung).
Klassifiziere das folgende Nutzer-Feedback:

Titel: "${cleanTitle}"
Beschreibung: "${cleanBody}"

Entscheide:
- "bug"     → Etwas funktioniert nicht, es liegt ein konkreter Fehler vor
- "feature" → Verbesserungswunsch, neue Funktion, Idee
- "noise"   → Unklar, zu allgemein, kein klarer Handlungsbedarf

Antworte NUR mit diesem JSON, kein Markdown:
{"classification":"bug|feature|noise","confidence":0.0,"reasoning":"1 Satz Begründung"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API Fehler: ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      classification: parsed.classification ?? "noise",
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return { classification: "noise", confidence: 0.3, reasoning: "Parse-Fehler" };
  }
}

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

export async function classifyAndQueueFeedback(feedbackId: string): Promise<void> {
  const fb = await db.query.feedback.findFirst({
    where: eq(feedback.id, feedbackId),
  });
  if (!fb) return;

  console.log(`[Feedback-Classifier] Klassifiziere: "${fb.title}"`);

  let result: ClassifyResult;
  try {
    result = await classifyWithClaude(fb.title, fb.body);
  } catch (err) {
    console.error("[Feedback-Classifier] Fehler:", err);
    return;
  }

  console.log(`[Feedback-Classifier] → ${result.classification} (${Math.round(result.confidence * 100)}%): ${result.reasoning}`);

  // Klassifikation speichern
  await db.update(feedback).set({
    aiClassification: result.classification,
    aiConfidence: result.confidence,
    aiReasoning: result.reasoning,
  }).where(eq(feedback.id, feedbackId));

  // Bug mit hoher Konfidenz → automatisch in Queue
  if (result.classification === "bug" && result.confidence >= AUTO_BUG_THRESHOLD) {
    const taskId = nanoid(12);
    await db.insert(agentTasks).values({
      id: taskId,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: "bugfix",
      status: "pending",
      priority: 2,
      title: `[Feedback] Bug: ${fb.title}`,
      description: `Bug-Report von Nutzer:\n\n${fb.body}\n\nKI-Begründung: ${result.reasoning}`,
      submittedBy: "feedback-classifier",
    });

    // Feedback mit Task verknüpfen + Status setzen
    await db.update(feedback).set({
      agentTaskId: taskId,
      status: "in_progress",
    }).where(eq(feedback.id, feedbackId));

    console.log(`[Feedback-Classifier] ✅ Bug automatisch in Queue: ${taskId}`);
  }
}

// ─── Admin: Feature bestätigen ────────────────────────────────────────────────

export async function approveFeatureForAgent(feedbackId: string): Promise<string> {
  const fb = await db.query.feedback.findFirst({
    where: eq(feedback.id, feedbackId),
  });
  if (!fb) throw new Error("Feedback nicht gefunden");

  const taskId = nanoid(12);
  await db.insert(agentTasks).values({
    id: taskId,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: "feature",
    status: "pending",
    priority: 5,
    title: `[Feedback] Feature: ${fb.title}`,
    description: `Feature-Anfrage von Nutzer (vom Admin bestätigt):\n\n${fb.body}`,
    submittedBy: "admin-approved",
  });

  await db.update(feedback).set({
    agentTaskId: taskId,
    adminApproved: 1,
    status: "planned",
  }).where(eq(feedback.id, feedbackId));

  return taskId;
}
