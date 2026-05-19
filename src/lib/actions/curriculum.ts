"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, classes, classMembers, curriculumUnits } from "@/db/schema";
import { canManageClass } from "@/lib/permissions";
import { and, eq, isNull, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

export async function setTaskCurriculum(input: { taskId: string; curriculumUnitId: string | null }) {
  const teacher = await requireTeacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  if (!(await canManageClass(teacher.id, t.classId))) throw new Error("Keine Berechtigung");
  await db.update(tasks).set({ curriculumUnitId: input.curriculumUnitId }).where(eq(tasks.id, input.taskId));
  revalidatePath("/austausch");
  return true;
}

export async function setTaskShared(input: { taskId: string; shared: boolean }) {
  const teacher = await requireTeacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  if (!(await canManageClass(teacher.id, t.classId))) throw new Error("Keine Berechtigung");
  await db.update(tasks).set({ sharedInSchool: input.shared }).where(eq(tasks.id, input.taskId));
  revalidatePath("/austausch");
  return true;
}

/**
 * Kopiert eine geteilte Aufgabe aus dem Austausch in eine Klasse, die ich verwalte.
 * Eigentum (authorId) bleibt beim Original-Autor, aber Klasse + Status werden gewechselt.
 */
export async function cloneTaskToClass(input: { sourceTaskId: string; targetClassId: string; publish?: boolean }) {
  const teacher = await requireTeacher();
  const src = await db.query.tasks.findFirst({ where: eq(tasks.id, input.sourceTaskId) });
  if (!src) throw new Error("Quell-Aufgabe nicht gefunden");
  if (!src.sharedInSchool) throw new Error("Aufgabe ist nicht im Austausch freigegeben");
  // Quell-Klasse darf in derselben Schule sein
  const srcClass = await db.query.classes.findFirst({ where: eq(classes.id, src.classId) });
  if (!srcClass) throw new Error("Quell-Klasse nicht gefunden");
  if (srcClass.schoolId !== teacher.schoolId) throw new Error("Aufgabe gehört zu einer anderen Schule");

  if (!(await canManageClass(teacher.id, input.targetClassId))) throw new Error("Keine Berechtigung für Zielklasse");

  const [copy] = await db.insert(tasks).values({
    classId: input.targetClassId,
    topicId: null,
    authorId: teacher.id,
    type: src.type,
    title: src.title + " (kopiert)",
    description: src.description,
    payload: src.payload,
    xpReward: src.xpReward,
    examMode: src.examMode,
    timeLimitMinutes: src.timeLimitMinutes,
    difficulty: src.difficulty,
    curriculumUnitId: src.curriculumUnitId,
    sharedInSchool: false,
    clonedFromTaskId: src.id,
    publishedAt: input.publish ? new Date() : null,
    createdAt: new Date(),
  }).returning();

  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.targetClassId}`);
  return copy.id;
}

export async function createCurriculumUnit(input: {
  parentId: string | null;
  code: string;
  title: string;
  description?: string | null;
  schoolScope: "global" | "school";
}) {
  const teacher = await requireTeacher();
  if (!input.title.trim()) throw new Error("Titel fehlt");
  const [u] = await db.insert(curriculumUnits).values({
    schoolId: input.schoolScope === "global" ? null : teacher.schoolId,
    parentId: input.parentId,
    code: input.code?.trim() || null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    position: 999,
    createdAt: new Date(),
  }).returning();
  revalidatePath("/austausch");
  return u.id;
}

export async function deleteCurriculumUnit(id: string) {
  const teacher = await requireTeacher();
  const u = await db.query.curriculumUnits.findFirst({ where: eq(curriculumUnits.id, id) });
  if (!u) throw new Error("Eintrag nicht gefunden");
  if (u.schoolId !== teacher.schoolId) throw new Error("Globale Einträge können nicht gelöscht werden");
  await db.delete(curriculumUnits).where(eq(curriculumUnits.id, id));
  revalidatePath("/austausch");
}
