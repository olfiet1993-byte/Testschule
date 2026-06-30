"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { questions, answers, classes, classMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function user() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  return session.user;
}

async function ensureClassAccess(userId: string, classId: string, role: "teacher" | "student" | "admin") {
  if (role === "teacher") {
    const c = await db.query.classes.findFirst({
      where: and(eq(classes.id, classId), eq(classes.teacherId, userId)),
    });
    if (!c) throw new Error("Klasse nicht gefunden");
  } else {
    const m = await db.query.classMembers.findFirst({
      where: and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)),
    });
    if (!m) throw new Error("Du bist nicht in dieser Klasse");
  }
}

export async function createQuestion(formData: FormData) {
  const me = await user();
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim() || null;
  if (!classId || !title || !body) throw new Error("Klasse, Titel und Frage sind erforderlich");
  await ensureClassAccess(me.id, classId, me.role);

  const [q] = await db.insert(questions).values({
    classId, topicId, authorId: me.id, title, body,
  }).returning();
  revalidatePath(`/klassen/${classId}/forum`);
  revalidatePath(`/sus/forum`);
  redirect(`/forum/${q.id}`);
}

export async function addAnswer(questionId: string, body: string) {
  const me = await user();
  const text = body.trim();
  if (!text) throw new Error("Antwort darf nicht leer sein");
  const q = await db.query.questions.findFirst({ where: eq(questions.id, questionId) });
  if (!q) throw new Error("Frage nicht gefunden");
  await ensureClassAccess(me.id, q.classId, me.role);

  await db.insert(answers).values({
    questionId, authorId: me.id, body: text,
  });

  // Frage-Autor benachrichtigen (außer er antwortet sich selbst)
  if (q.authorId !== me.id) {
    const { notify } = await import("@/lib/notifications");
    await notify(q.authorId, {
      type: "new_answer",
      title: `${me.displayName} hat geantwortet`,
      body: q.title.length > 60 ? q.title.slice(0, 60) + "…" : q.title,
      href: `/forum/${q.id}`,
    });
  }

  revalidatePath(`/forum/${questionId}`);
  revalidatePath(`/klassen/${q.classId}/forum`);
}

export async function deleteQuestion(questionId: string) {
  const me = await user();
  const q = await db.query.questions.findFirst({ where: eq(questions.id, questionId) });
  if (!q) return;
  // Nur Author oder Lehrer der Klasse
  if (q.authorId !== me.id && me.role !== "teacher") throw new Error("Nicht erlaubt");
  if (me.role === "teacher") {
    await ensureClassAccess(me.id, q.classId, "teacher");
  }
  await db.delete(questions).where(eq(questions.id, questionId));
  revalidatePath(`/klassen/${q.classId}/forum`);
  revalidatePath(`/sus/forum`);
  redirect(`/klassen/${q.classId}/forum`);
}

export async function deleteAnswer(answerId: string) {
  const me = await user();
  const a = await db.query.answers.findFirst({ where: eq(answers.id, answerId) });
  if (!a) return;
  if (a.authorId !== me.id && me.role !== "teacher") throw new Error("Nicht erlaubt");
  await db.delete(answers).where(eq(answers.id, answerId));
  revalidatePath(`/forum/${a.questionId}`);
}

export async function toggleQuestionResolved(questionId: string) {
  const me = await user();
  const q = await db.query.questions.findFirst({ where: eq(questions.id, questionId) });
  if (!q) return;
  if (q.authorId !== me.id && me.role !== "teacher") throw new Error("Nicht erlaubt");
  await db.update(questions).set({ resolved: !q.resolved }).where(eq(questions.id, questionId));
  revalidatePath(`/forum/${questionId}`);
  revalidatePath(`/klassen/${q.classId}/forum`);
}

export async function markAnswerAccepted(answerId: string) {
  const me = await user();
  const a = await db.query.answers.findFirst({ where: eq(answers.id, answerId) });
  if (!a) return;
  const q = await db.query.questions.findFirst({ where: eq(questions.id, a.questionId) });
  if (!q) return;
  // Nur Frage-Autor oder Lehrer
  if (q.authorId !== me.id && me.role !== "teacher") throw new Error("Nicht erlaubt");

  // alle anderen Antworten der Frage zurücksetzen
  await db.update(answers).set({ isAccepted: false }).where(eq(answers.questionId, q.id));
  await db.update(answers).set({ isAccepted: true }).where(eq(answers.id, answerId));
  await db.update(questions).set({ resolved: true }).where(eq(questions.id, q.id));
  revalidatePath(`/forum/${q.id}`);
  revalidatePath(`/klassen/${q.classId}/forum`);
}
