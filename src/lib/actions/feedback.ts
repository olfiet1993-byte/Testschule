"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { feedback, feedbackVotes, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { classifyAndQueueFeedback, approveFeatureForAgent } from "@/lib/agent/feedback-classifier";

type FeedbackType = "idea" | "bug" | "question" | "other";
type FeedbackStatus = "open" | "planned" | "in_progress" | "done" | "wontfix";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

async function requireTeacher() {
  const u = await requireUser();
  if (u.role !== "teacher" && u.role !== "admin") throw new Error("Nur Lehrkräfte oder Admins");
  return u;
}

export async function submitFeedback(input: {
  type: FeedbackType;
  title: string;
  body: string;
}) {
  const user = await requireUser();
  if (!input.title.trim()) throw new Error("Titel fehlt");
  if (!input.body.trim()) throw new Error("Beschreibung fehlt");
  if (input.title.length > 120) throw new Error("Titel zu lang (max 120)");
  if (input.body.length > 4000) throw new Error("Beschreibung zu lang (max 4000)");

  const ids = await db.insert(feedback).values({
    userId: user.id,
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    status: "open",
    createdAt: new Date(),
  }).returning({ id: feedback.id });

  // Eigenen Upvote auto-anlegen
  await db.insert(feedbackVotes).values({
    feedbackId: ids[0].id,
    userId: user.id,
    createdAt: new Date(),
  });

  revalidatePath("/feedback");

  // KI-Klassifikation fire-and-forget (blockiert den User nicht)
  classifyAndQueueFeedback(ids[0].id).catch((err) =>
    console.error("[Feedback] Klassifikation fehlgeschlagen:", err),
  );

  return ids[0].id;
}

export async function toggleFeedbackVote(feedbackId: string) {
  const user = await requireUser();
  const existing = await db.query.feedbackVotes.findFirst({
    where: and(eq(feedbackVotes.feedbackId, feedbackId), eq(feedbackVotes.userId, user.id)),
  });
  if (existing) {
    await db.delete(feedbackVotes).where(
      and(eq(feedbackVotes.feedbackId, feedbackId), eq(feedbackVotes.userId, user.id)),
    );
  } else {
    await db.insert(feedbackVotes).values({
      feedbackId,
      userId: user.id,
      createdAt: new Date(),
    });
  }
  revalidatePath("/feedback");
  return !existing;
}

export async function updateFeedbackStatus(input: {
  feedbackId: string;
  status: FeedbackStatus;
  response?: string | null;
}) {
  const t = await requireTeacher();
  const fb = await db.query.feedback.findFirst({ where: eq(feedback.id, input.feedbackId) });
  if (!fb) throw new Error("Feedback nicht gefunden");

  const patch: any = { status: input.status };
  if (input.response !== undefined) {
    patch.response = input.response?.trim() || null;
    patch.respondedBy = t.id;
    patch.respondedAt = new Date();
  }
  await db.update(feedback).set(patch).where(eq(feedback.id, input.feedbackId));
  revalidatePath("/feedback");
}

// Admin: Feature-Anfrage zur Umsetzung durch Dev-Agent freigeben
export async function approveAndImplementFeedback(feedbackId: string) {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Nur Admins");
  const taskId = await approveFeatureForAgent(feedbackId);
  revalidatePath("/feedback");
  revalidatePath("/admin/ki");
  return taskId;
}

// Admin: Feedback ablehnen
export async function rejectFeedback(feedbackId: string) {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Nur Admins");
  await db.update(feedback).set({
    adminApproved: -1,
    status: "wontfix",
  }).where(eq(feedback.id, feedbackId));
  revalidatePath("/feedback");
}

export async function deleteFeedback(feedbackId: string) {
  const user = await requireUser();
  const fb = await db.query.feedback.findFirst({ where: eq(feedback.id, feedbackId) });
  if (!fb) throw new Error("Feedback nicht gefunden");
  // Eigentümer oder Lehrkraft darf löschen
  if (fb.userId !== user.id && user.role !== "teacher" && user.role !== "admin") {
    throw new Error("Keine Berechtigung");
  }
  await db.delete(feedback).where(eq(feedback.id, feedbackId));
  revalidatePath("/feedback");
}
