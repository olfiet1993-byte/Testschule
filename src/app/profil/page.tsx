import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, classMembers, classes, submissions } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ProfilClient } from "./ProfilClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!me) redirect("/login");

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, me.id),
  });
  const myClasses = memberships.length
    ? await db.query.classes.findMany({
        where: inArray(classes.id, memberships.map((m) => m.classId)),
      })
    : [];

  // Statistik: Anzahl abgegebener Aufgaben, Ø Score
  const mySubs = await db.query.submissions.findMany({
    where: eq(submissions.userId, me.id),
  });
  const scores = mySubs.filter((s) => s.scorePct != null).map((s) => s.scorePct!);
  const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Aktivität: Anzahl Submissions pro Tag (letzte 90 Tage)
  const activityMap = new Map<string, number>();
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  for (const s of mySubs) {
    if (!s.submittedAt) continue;
    const ts = new Date(s.submittedAt).getTime();
    if (ts < ninetyDaysAgo) continue;
    const key = new Date(s.submittedAt).toISOString().slice(0, 10);
    activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
  }
  const activities = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));

  return (
    <AppShell>
      <ProfilClient
        user={JSON.parse(JSON.stringify(me))}
        classes={JSON.parse(JSON.stringify(myClasses))}
        activities={activities}
        stats={{
          submissions: mySubs.length,
          meanScore,
          totalXpEarned: mySubs.reduce((a, s) => a + s.xpEarned, 0),
        }}
      />
    </AppShell>
  );
}
