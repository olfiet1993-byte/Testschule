import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type NotificationType =
  | "task_published"
  | "new_message"
  | "new_answer"
  | "answer_accepted"
  | "live_quiz_started";

export async function notify(
  userId: string,
  input: { type: NotificationType; title: string; body?: string; href?: string },
) {
  await db.insert(notifications).values({
    userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
  });
}

export async function notifyMany(
  userIds: string[],
  input: { type: NotificationType; title: string; body?: string; href?: string },
) {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    }))
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const r = await db
    .select({ v: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
  return Number(r[0]?.v ?? 0);
}
