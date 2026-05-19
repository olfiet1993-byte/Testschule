import { db } from "@/db";
import { classes, classTeachers } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

/**
 * Prüft, ob der User die Klasse verwalten darf:
 * - ist der primäre Lehrer (classes.teacherId)
 * - oder als Co-Lehrer in classTeachers eingetragen
 */
export async function canManageClass(userId: string, classId: string): Promise<boolean> {
  const c = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
  if (!c) return false;
  if (c.teacherId === userId) return true;
  const co = await db.query.classTeachers.findFirst({
    where: and(eq(classTeachers.classId, classId), eq(classTeachers.userId, userId)),
  });
  return !!co;
}

/** Liefert alle classIds, die der User verwalten darf (primär + co). */
export async function manageableClassIds(userId: string): Promise<string[]> {
  const owned = await db.query.classes.findMany({ where: eq(classes.teacherId, userId) });
  const co = await db.query.classTeachers.findMany({ where: eq(classTeachers.userId, userId) });
  return Array.from(new Set([...owned.map((c) => c.id), ...co.map((c) => c.classId)]));
}
