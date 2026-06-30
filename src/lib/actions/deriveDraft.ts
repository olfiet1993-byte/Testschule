"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, classes } from "@/db/schema";
import { canManageClass } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { deriveTaskFromContent, deriveTaskFromImage, deriveTaskFromLink } from "./aiTaskGen";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

type TaskType = "quiz" | "cloze" | "flashcards" | "case_study";

/**
 * Generiert per KI eine Aufgabe aus einem Bibliothekstext und legt sie als
 * Entwurf in der Klasse an. Gibt die neue Task-ID zurück, damit der Client
 * direkt zum Editor weiterleiten kann.
 */
export async function deriveDraftFromContent(input: {
  type: TaskType;
  classId: string;
  contentTitle: string;
  contentBody?: string;
  /** Optional: Wenn gesetzt, wird das Bild per Vision-API analysiert (Pfad wie /uploads/xxx.jpg). */
  imagePath?: string | null;
  /** Optional: Wenn gesetzt, wird Quelltyp als Link behandelt — nutzt Titel/Beschreibung/URL als Kontext. */
  url?: string | null;
}): Promise<{ taskId: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!(await canManageClass(session.user.id, input.classId))) throw new Error("Keine Berechtigung");

  // Quelle erkennen
  const source: "image" | "link" | "text" =
    input.imagePath ? "image" : input.url ? "link" : "text";

  // KI-Generierung je nach Quelle
  let result: any;
  if (source === "image") {
    result = await deriveTaskFromImage({
      type: input.type,
      contentTitle: input.contentTitle,
      imagePath: input.imagePath!,
      description: input.contentBody ?? "",
    });
  } else if (source === "link") {
    result = await deriveTaskFromLink({
      type: input.type,
      contentTitle: input.contentTitle,
      url: input.url!,
      description: input.contentBody ?? "",
    });
  } else {
    if (!input.contentBody?.trim()) throw new Error("Quelltext ist leer");
    result = await deriveTaskFromContent({
      type: input.type,
      contentTitle: input.contentTitle,
      contentBody: input.contentBody,
    });
  }

  // Payload je Typ normalisieren
  let payload: any;
  switch (input.type) {
    case "quiz":
      if (!Array.isArray(result?.questions) || result.questions.length === 0) {
        throw new Error("KI hat keine Fragen geliefert");
      }
      payload = {
        questions: result.questions.map((q: any) => ({
          question: String(q.question ?? ""),
          options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : ["", "", "", ""],
          correctIndex: Math.max(0, Math.min(Number(q.correctIndex ?? 0), (q.options?.length ?? 1) - 1)),
          explanation: q.explanation ? String(q.explanation) : "",
        })),
      };
      break;
    case "cloze":
      if (!result?.text) throw new Error("KI hat keinen Text geliefert");
      payload = {
        text: String(result.text),
        blanks: Array.isArray(result.blanks) ? result.blanks.map((b: any, i: number) => ({
          index: i,
          answers: Array.isArray(b.answers) ? b.answers.map(String) : [""],
          caseSensitive: !!b.caseSensitive,
        })) : [],
      };
      break;
    case "flashcards":
      if (!Array.isArray(result?.cards) || result.cards.length === 0) {
        throw new Error("KI hat keine Karten geliefert");
      }
      payload = {
        cards: result.cards.map((c: any) => ({
          front: String(c.front ?? ""),
          back: String(c.back ?? ""),
        })),
      };
      break;
    case "case_study":
      if (!result?.situation && !result?.intro) throw new Error("KI hat keinen Fall geliefert");
      payload = {
        intro: String(result.situation ?? result.intro ?? ""),
        steps: (Array.isArray(result.questions) ? result.questions : [])
          .map((q: any) => ({
            id: nanoid(6),
            description: "",
            question: String(q.question ?? ""),
            options: [
              { text: String(q.sampleAnswer ?? "Richtige Reaktion"), feedback: "Richtig.", isCorrect: true, next: null },
              { text: "Nichts tun, abwarten.", feedback: "Im Notfall meist falsch.", isCorrect: false, next: null },
            ],
          })),
      };
      break;
  }

  const xp = input.type === "case_study" ? 30 : input.type === "flashcards" ? 15 : 20;
  const titleSuffix = {
    quiz: "Quiz",
    cloze: "Lückentext",
    flashcards: "Karteikarten",
    case_study: "Fallstudie",
  }[input.type];

  const sourceLabel = source === "image" ? "Bibliotheks-Bild" : source === "link" ? "Bibliotheks-Link" : "Bibliotheks-Text";

  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    authorId: session.user.id,
    type: input.type,
    title: `${input.contentTitle.trim() || "Lerninhalt"} — ${titleSuffix} (KI-Entwurf)`,
    description: `Automatisch aus ${sourceLabel} abgeleitet. Vor Veröffentlichung prüfen.`,
    payload: JSON.stringify(payload),
    xpReward: xp,
    publishedAt: null,
    examMode: false,
    difficulty: 2,
    createdAt: new Date(),
    aiGenerated: true,
    reviewedAt: null,
  }).returning();

  revalidatePath("/aufgaben");
  revalidatePath(`/aufgaben/${task.id}/bearbeiten`);
  return { taskId: task.id };
}
