"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { learningPaths, learningPathItems, tasks } from "@/db/schema";
import { canManageClass } from "@/lib/permissions";
import { and, eq, gt, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireTeacherForClass(classId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  if (!(await canManageClass(session.user.id, classId))) throw new Error("Keine Berechtigung");
  return session.user.id;
}

async function requireTeacherForPath(pathId: string) {
  const p = await db.query.learningPaths.findFirst({ where: eq(learningPaths.id, pathId) });
  if (!p) throw new Error("Lernpfad nicht gefunden");
  await requireTeacherForClass(p.classId);
  return p;
}

function isoMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) throw new Error("Ungültiges Datum");
  const dow = (d.getDay() + 6) % 7; // 0=Mo
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export async function createLearningPath(input: {
  classId: string;
  topicId?: string | null;
  name: string;
  description?: string | null;
  startsOn: string;
  numWeeks: number;
}) {
  const teacherId = await requireTeacherForClass(input.classId);
  if (!input.name.trim()) throw new Error("Name fehlt");
  if (input.numWeeks < 1 || input.numWeeks > 26) throw new Error("Wochenanzahl 1–26");
  const startsOn = isoMonday(input.startsOn);
  const ids = await db.insert(learningPaths).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    startsOn,
    numWeeks: input.numWeeks,
    createdBy: teacherId,
    createdAt: new Date(),
  }).returning({ id: learningPaths.id });
  revalidatePath(`/klassen/${input.classId}/lernpfade`);
  return ids[0].id;
}

export async function updateLearningPath(input: {
  pathId: string;
  name?: string;
  description?: string | null;
  startsOn?: string;
  numWeeks?: number;
  topicId?: string | null;
  archived?: boolean;
}) {
  const p = await requireTeacherForPath(input.pathId);
  const patch: any = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("Name fehlt");
    patch.name = input.name.trim();
  }
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.startsOn !== undefined) patch.startsOn = isoMonday(input.startsOn);
  if (input.numWeeks !== undefined) {
    if (input.numWeeks < 1 || input.numWeeks > 26) throw new Error("Wochenanzahl 1–26");
    patch.numWeeks = input.numWeeks;
    // Items oberhalb der neuen Wochenanzahl löschen
    await db.delete(learningPathItems).where(
      and(eq(learningPathItems.pathId, input.pathId), gt(learningPathItems.weekIndex, input.numWeeks)),
    );
  }
  if (input.topicId !== undefined) patch.topicId = input.topicId ?? null;
  if (input.archived !== undefined) patch.archived = input.archived;
  if (Object.keys(patch).length > 0) {
    await db.update(learningPaths).set(patch).where(eq(learningPaths.id, input.pathId));
  }
  revalidatePath(`/klassen/${p.classId}/lernpfade`);
  revalidatePath(`/klassen/${p.classId}/lernpfade/${input.pathId}`);
}

export async function deleteLearningPath(pathId: string) {
  const p = await requireTeacherForPath(pathId);
  await db.delete(learningPaths).where(eq(learningPaths.id, pathId));
  revalidatePath(`/klassen/${p.classId}/lernpfade`);
}

export async function addPathItem(input: {
  pathId: string;
  weekIndex: number;
  taskId: string;
  note?: string | null;
}) {
  const p = await requireTeacherForPath(input.pathId);
  if (input.weekIndex < 1 || input.weekIndex > p.numWeeks) throw new Error("Woche außerhalb des Lernpfads");
  // Aufgabe gehört zur Klasse?
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!t || t.classId !== p.classId) throw new Error("Aufgabe gehört nicht zu dieser Klasse");
  // Maximaler order ermitteln
  const existing = await db
    .select({ order: learningPathItems.order })
    .from(learningPathItems)
    .where(and(eq(learningPathItems.pathId, input.pathId), eq(learningPathItems.weekIndex, input.weekIndex)))
    .orderBy(desc(learningPathItems.order))
    .limit(1);
  const nextOrder = (existing[0]?.order ?? -1) + 1;
  await db.insert(learningPathItems).values({
    pathId: input.pathId,
    weekIndex: input.weekIndex,
    taskId: input.taskId,
    order: nextOrder,
    note: input.note?.trim() || null,
    createdAt: new Date(),
  });
  revalidatePath(`/klassen/${p.classId}/lernpfade/${input.pathId}`);
}

export async function removePathItem(itemId: string) {
  const item = await db.query.learningPathItems.findFirst({ where: eq(learningPathItems.id, itemId) });
  if (!item) throw new Error("Item nicht gefunden");
  const p = await requireTeacherForPath(item.pathId);
  await db.delete(learningPathItems).where(eq(learningPathItems.id, itemId));
  revalidatePath(`/klassen/${p.classId}/lernpfade/${item.pathId}`);
}

export async function movePathItem(input: { itemId: string; toWeek: number }) {
  const item = await db.query.learningPathItems.findFirst({ where: eq(learningPathItems.id, input.itemId) });
  if (!item) throw new Error("Item nicht gefunden");
  const p = await requireTeacherForPath(item.pathId);
  if (input.toWeek < 1 || input.toWeek > p.numWeeks) throw new Error("Woche außerhalb des Lernpfads");
  await db.update(learningPathItems).set({ weekIndex: input.toWeek, order: 999 }).where(eq(learningPathItems.id, input.itemId));
  revalidatePath(`/klassen/${p.classId}/lernpfade/${item.pathId}`);
}

/**
 * Auto-Generator: verteilt veröffentlichte Aufgaben (optional aus Thema)
 * gleichmäßig über die Wochen, sortiert nach Schwierigkeit (leicht → schwer).
 * Aufgaben ohne Schwierigkeit kommen in die Mitte.
 */
export async function autoFillLearningPath(input: {
  pathId: string;
  fromTopicId?: string | null;
  onlyPublished?: boolean;
}) {
  const p = await requireTeacherForPath(input.pathId);
  // Bestehende Items leeren
  await db.delete(learningPathItems).where(eq(learningPathItems.pathId, input.pathId));

  // Aufgaben holen
  let pool = await db.query.tasks.findMany({
    where: eq(tasks.classId, p.classId),
  });
  if (input.onlyPublished) pool = pool.filter((t) => Boolean(t.publishedAt));
  if (input.fromTopicId) pool = pool.filter((t) => t.topicId === input.fromTopicId);
  // Sortierung: difficulty (1,2,3, null→2), dann createdAt
  pool.sort((a, b) => {
    const da = a.difficulty ?? 2;
    const db_ = b.difficulty ?? 2;
    if (da !== db_) return da - db_;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (pool.length === 0) return { added: 0 };

  // Round-Robin verteilen — gleichmäßig, jeweils 1 pro Woche, dann wieder von vorn
  const inserts: any[] = [];
  let week = 1;
  let orderCounters: Record<number, number> = {};
  for (const t of pool) {
    if (!orderCounters[week]) orderCounters[week] = 0;
    inserts.push({
      pathId: input.pathId,
      weekIndex: week,
      taskId: t.id,
      order: orderCounters[week]++,
      note: null,
      createdAt: new Date(),
    });
    week++;
    if (week > p.numWeeks) week = 1;
  }
  await db.insert(learningPathItems).values(inserts);
  revalidatePath(`/klassen/${p.classId}/lernpfade/${input.pathId}`);
  return { added: inserts.length };
}
