"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) return;
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
  revalidatePath("/");
}

export async function markAllRead() {
  const session = await auth();
  if (!session?.user) return;
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, session.user.id), sql`${notifications.readAt} IS NULL`));
  revalidatePath("/");
}
