"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { topics, classes, tasks } from "@/db/schema";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

async function ownsClass(userId: string, classId: string) {
  const c = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, userId)),
  });
  if (!c) throw new Error("Klasse nicht gefunden");
  return c;
}

export async function createTopic(formData: FormData) {
  const me = await teacher();
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!classId || !title) throw new Error("Klasse und Titel sind nötig");
  await ownsClass(me.id, classId);

  const [maxRow] = await db
    .select({ v: max(topics.position) })
    .from(topics)
    .where(eq(topics.classId, classId));
  const nextPos = (maxRow?.v ?? 0) + 1;

  await db.insert(topics).values({ classId, title, description, position: nextPos });
  revalidatePath(`/klassen/${classId}`);
  revalidatePath(`/sus/aufgaben`);
}

export async function updateTopic(input: { id: string; title: string; description?: string }) {
  const me = await teacher();
  const t = await db.query.topics.findFirst({ where: eq(topics.id, input.id) });
  if (!t) throw new Error("Thema nicht gefunden");
  await ownsClass(me.id, t.classId);
  await db.update(topics).set({
    title: input.title.trim(),
    description: input.description?.trim() || null,
  }).where(eq(topics.id, input.id));
  revalidatePath(`/klassen/${t.classId}`);
}

export async function deleteTopic(topicId: string) {
  const me = await teacher();
  const t = await db.query.topics.findFirst({ where: eq(topics.id, topicId) });
  if (!t) return;
  await ownsClass(me.id, t.classId);
  // Aufgaben werden NICHT gelöscht, nur deren topicId auf null gesetzt (ON DELETE SET NULL)
  await db.delete(topics).where(eq(topics.id, topicId));
  revalidatePath(`/klassen/${t.classId}`);
  revalidatePath("/aufgaben");
}

export async function moveTopic(topicId: string, direction: "up" | "down") {
  const me = await teacher();
  const t = await db.query.topics.findFirst({ where: eq(topics.id, topicId) });
  if (!t) return;
  await ownsClass(me.id, t.classId);

  const all = await db.query.topics.findMany({
    where: eq(topics.classId, t.classId),
    orderBy: [asc(topics.position), asc(topics.createdAt)],
  });
  const idx = all.findIndex((x) => x.id === topicId);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return;

  const a = all[idx], b = all[swapIdx];
  await db.update(topics).set({ position: b.position }).where(eq(topics.id, a.id));
  await db.update(topics).set({ position: a.position }).where(eq(topics.id, b.id));
  revalidatePath(`/klassen/${t.classId}`);
}
