"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, users, classes, classMembers } from "@/db/schema";
import { and, eq, or, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function user() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  return session.user;
}

/**
 * Prüft, ob Sender und Empfänger dieselbe Schule haben UND
 * - Lehrer↔Schüler einer seiner Klassen, oder
 * - Lehrer↔Lehrer derselben Schule.
 */
async function canMessage(senderId: string, recipientId: string, schoolId: string): Promise<boolean> {
  const sender = await db.query.users.findFirst({ where: eq(users.id, senderId) });
  const recipient = await db.query.users.findFirst({ where: eq(users.id, recipientId) });
  if (!sender || !recipient) return false;
  if (sender.schoolId !== schoolId || recipient.schoolId !== schoolId) return false;

  if (sender.role === "teacher" && recipient.role === "teacher") return true;
  // Lehrer↔Schüler: Schüler muss in einer der Klassen des Lehrers sein
  const teacher = sender.role === "teacher" ? sender : recipient;
  const student = sender.role === "student" ? sender : recipient;
  if (teacher.role !== "teacher" || student.role !== "student") return false;

  const myClasses = await db.query.classes.findMany({ where: eq(classes.teacherId, teacher.id) });
  if (myClasses.length === 0) return false;
  for (const c of myClasses) {
    const m = await db.query.classMembers.findFirst({
      where: and(eq(classMembers.classId, c.id), eq(classMembers.userId, student.id)),
    });
    if (m) return true;
  }
  return false;
}

export async function sendMessage(recipientId: string, body: string) {
  const me = await user();
  const text = body.trim();
  if (!text) throw new Error("Nachricht darf nicht leer sein");
  const ok = await canMessage(me.id, recipientId, me.schoolId);
  if (!ok) throw new Error("Du kannst dieser Person keine Nachricht senden");

  await db.insert(messages).values({
    schoolId: me.schoolId,
    senderId: me.id,
    recipientId,
    body: text,
  });

  // Notification
  const { notify } = await import("@/lib/notifications");
  await notify(recipientId, {
    type: "new_message",
    title: `Neue Nachricht von ${me.displayName}`,
    body: text.length > 80 ? text.slice(0, 80) + "…" : text,
    href: `/nachrichten/${me.id}`,
  });

  revalidatePath("/nachrichten");
  revalidatePath(`/nachrichten/${recipientId}`);
}

export async function markConversationRead(otherUserId: string) {
  const me = await user();
  await db.update(messages)
    .set({ readAt: new Date() })
    .where(and(
      eq(messages.recipientId, me.id),
      eq(messages.senderId, otherUserId),
      sql`${messages.readAt} IS NULL`,
    ));
  revalidatePath("/nachrichten");
}

export async function deleteMessage(messageId: string) {
  const me = await user();
  const m = await db.query.messages.findFirst({ where: eq(messages.id, messageId) });
  if (!m) return;
  if (m.senderId !== me.id) throw new Error("Nur eigene Nachrichten löschbar");
  await db.delete(messages).where(eq(messages.id, messageId));
  revalidatePath("/nachrichten");
  revalidatePath(`/nachrichten/${m.recipientId}`);
}

export async function unreadCount(userId: string): Promise<number> {
  const r = await db
    .select({ v: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.recipientId, userId), sql`${messages.readAt} IS NULL`));
  return Number(r[0]?.v ?? 0);
}
