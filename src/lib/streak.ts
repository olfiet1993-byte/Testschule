import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Aktualisiert lastActiveAt + streakDays für einen User.
 * - Gleicher Tag wie lastActive: nichts ändern (Streak schon registriert)
 * - Genau ein Tag her: streak + 1
 * - Mehr als ein Tag: streak zurück auf 1 (heute zählt aber als Tag-1)
 */
export async function updateStreak(userId: string): Promise<void> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return;

  const now = new Date();
  const today = startOfDay(now);

  const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
  const lastDay = lastActive ? startOfDay(lastActive) : null;

  let newStreak = u.streakDays;
  if (!lastDay) {
    newStreak = 1;
  } else {
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      // schon heute aktiv → streak bleibt
      newStreak = Math.max(1, u.streakDays);
    } else if (diffDays === 1) {
      newStreak = u.streakDays + 1;
    } else {
      newStreak = 1; // Reset, heute startet neuer Streak
    }
  }

  await db.update(users)
    .set({ streakDays: newStreak, lastActiveAt: now })
    .where(eq(users.id, userId));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
