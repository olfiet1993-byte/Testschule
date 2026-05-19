"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { classes, classTeachers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Nur der primäre Lehrer einer Klasse darf Co-Lehrer hinzufügen/entfernen.
 */
async function ensureClassOwner(classId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  const c = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, session.user.id)),
  });
  if (!c) throw new Error("Nur der Haupt-Lehrer der Klasse darf Co-Lehrer verwalten");
  return { session: session.user, klass: c };
}

export async function addCoTeacher(classId: string, userId: string) {
  const { session } = await ensureClassOwner(classId);
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw new Error("Lehrkraft nicht gefunden");
  if (target.role !== "teacher") throw new Error("Nur Lehrkräfte können Co-Lehrer sein");
  if (target.schoolId !== session.schoolId) throw new Error("Nur Lehrkräfte derselben Schule");
  if (userId === session.id) throw new Error("Du bist schon Haupt-Lehrer dieser Klasse");

  const exists = await db.query.classTeachers.findFirst({
    where: and(eq(classTeachers.classId, classId), eq(classTeachers.userId, userId)),
  });
  if (!exists) {
    await db.insert(classTeachers).values({ classId, userId });
  }
  revalidatePath(`/klassen/${classId}`);
}

export async function removeCoTeacher(classId: string, userId: string) {
  await ensureClassOwner(classId);
  await db.delete(classTeachers).where(
    and(eq(classTeachers.classId, classId), eq(classTeachers.userId, userId)),
  );
  revalidatePath(`/klassen/${classId}`);
}

/**
 * Übergabe der Haupt-Verantwortung an einen anderen Lehrer.
 * Der bisherige Haupt-Lehrer wird automatisch Co-Lehrer (es sei denn `step_down: true`).
 */
export async function transferClassOwnership(input: {
  classId: string;
  newOwnerId: string;
  stepDown?: boolean;
}) {
  const { session, klass } = await ensureClassOwner(input.classId);

  const newOwner = await db.query.users.findFirst({ where: eq(users.id, input.newOwnerId) });
  if (!newOwner) throw new Error("Lehrkraft nicht gefunden");
  if (newOwner.role !== "teacher") throw new Error("Nur Lehrkräfte");
  if (newOwner.schoolId !== session.schoolId) throw new Error("Nur Lehrkräfte derselben Schule");
  if (newOwner.id === session.id) throw new Error("Du bist schon Haupt-Lehrer");

  // Owner wechseln
  await db.update(classes).set({ teacherId: input.newOwnerId }).where(eq(classes.id, input.classId));

  // Neuen Owner ggf. aus classTeachers entfernen (er ist jetzt Owner)
  await db.delete(classTeachers).where(
    and(eq(classTeachers.classId, input.classId), eq(classTeachers.userId, input.newOwnerId)),
  );

  // Alten Owner als Co-Lehrer eintragen, außer er steigt aus
  if (!input.stepDown) {
    const existing = await db.query.classTeachers.findFirst({
      where: and(eq(classTeachers.classId, input.classId), eq(classTeachers.userId, session.id)),
    });
    if (!existing) {
      await db.insert(classTeachers).values({ classId: input.classId, userId: session.id });
    }
  }

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: session.schoolId, actorId: session.id, actorName: session.displayName,
    action: "class.delete", // kein eigener Code, "übergeben" wird im summary klar
    entityType: "class", entityId: input.classId,
    summary: `Klasse "${klass.name}" übergeben an ${newOwner.displayName}${input.stepDown ? " (Rückzug)" : ""}`,
  });

  revalidatePath(`/klassen/${input.classId}`);
  revalidatePath("/klassen");
  revalidatePath("/dashboard");
}
