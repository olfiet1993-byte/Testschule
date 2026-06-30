import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usageDays, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/usage/ping
 * Wird vom UsageTracker minütlich bei sichtbarem Tab gerufen.
 * Zählt pro User + Tag Minuten hoch (server-seitig auf ~1/Minute gedrosselt)
 * und aktualisiert users.lastActiveAt.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const userId = session.user.id;
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const existing = await db.query.usageDays.findFirst({
    where: and(eq(usageDays.userId, userId), eq(usageDays.day, day)),
  });

  if (existing) {
    const last = existing.lastPingAt ? new Date(existing.lastPingAt).getTime() : 0;
    // Throttle: Pings unter 45s Abstand zählen nicht (Doppel-Tabs, schnelle Reloads)
    if (now.getTime() - last >= 45_000) {
      await db
        .update(usageDays)
        .set({
          minutes: existing.minutes + 1,
          pings: existing.pings + 1,
          lastPingAt: now,
        })
        .where(and(eq(usageDays.userId, userId), eq(usageDays.day, day)));
    }
  } else {
    await db.insert(usageDays).values({
      userId,
      day,
      minutes: 1,
      pings: 1,
      lastPingAt: now,
    });
  }

  await db.update(users).set({ lastActiveAt: now }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
