"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { scheduleSlots, classes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function teacherOwnsClass(classId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  const c = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, session.user.id)),
  });
  if (!c) throw new Error("Klasse nicht gefunden");
  return c;
}

export async function addSlot(input: {
  classId: string;
  weekday: number;
  startTime: string;
  endTime?: string;
  title: string;
  topicId?: string | null;
  location?: string | null;
}) {
  await teacherOwnsClass(input.classId);
  if (!input.title.trim()) throw new Error("Titel fehlt");
  if (input.weekday < 0 || input.weekday > 6) throw new Error("Ungültiger Wochentag");
  if (!/^\d{1,2}:\d{2}$/.test(input.startTime)) throw new Error("Start-Zeit im Format HH:MM");

  await db.insert(scheduleSlots).values({
    classId: input.classId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime?.trim() || null,
    title: input.title.trim(),
    topicId: input.topicId ?? null,
    location: input.location?.trim() || null,
  });
  revalidatePath(`/klassen/${input.classId}/stundenplan`);
  revalidatePath("/sus");
}

export async function deleteSlot(slotId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  const slot = await db.query.scheduleSlots.findFirst({ where: eq(scheduleSlots.id, slotId) });
  if (!slot) return;
  await teacherOwnsClass(slot.classId);
  await db.delete(scheduleSlots).where(eq(scheduleSlots.id, slotId));
  revalidatePath(`/klassen/${slot.classId}/stundenplan`);
  revalidatePath("/sus");
}
