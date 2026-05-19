import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { levelTitle, xpForNextLevel } from "@/lib/utils";
import { Flame, Star, Trophy, Radio, Calendar, ClipboardList, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { users, classMembers, tasks, submissions } from "@/db/schema";
import { and, eq, inArray, isNotNull, asc } from "drizzle-orm";
import Link from "next/link";
import { getActiveSessionForClass } from "@/lib/live/sessions";

const typeLabels: Record<string, string> = {
  quiz: "Quiz", flashcards: "Karteikarten", image_hotspot: "Bilderrätsel", cloze: "Lückentext", case_study: "Fallstudie",
};

export default async function StudentHome() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");
  const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!me) redirect("/login");

  // Welche Klassen ist der Schüler Mitglied? Hat eine davon eine aktive Live-Session?
  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, session.user.id),
  });
  let activeLive: { sessionId: string; taskTitle: string; className: string } | null = null;
  for (const m of memberships) {
    const s = getActiveSessionForClass(m.classId);
    if (s) {
      activeLive = { sessionId: s.id, taskTitle: s.taskTitle, className: s.className };
      break;
    }
  }

  const classIds = memberships.map((m) => m.classId);

  // Aufgaben mit Frist heute/morgen, und alle unerledigten
  let todoTasks: any[] = [];
  if (classIds.length > 0) {
    const publishedTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.classId, classIds), isNotNull(tasks.publishedAt)),
      orderBy: [asc(tasks.dueAt)],
    });
    const mySubs = await db.query.submissions.findMany({
      where: eq(submissions.userId, session.user.id),
    });
    const doneIds = new Set(mySubs.filter((s) => (s.scorePct ?? 0) >= 70).map((s) => s.taskId));

    const todayMs = Date.now();
    const inThreeDays = todayMs + 1000 * 60 * 60 * 24 * 3;

    // Priorität: 1. Fristen heute/überfällig, 2. Fristen in 3 Tagen, 3. ohne Frist und nicht abgegeben
    todoTasks = publishedTasks
      .filter((t) => !doneIds.has(t.id))
      .map((t) => {
        const dueMs = t.dueAt ? new Date(t.dueAt).getTime() : null;
        let priority = 3;
        if (dueMs != null) {
          if (dueMs < todayMs) priority = 0; // überfällig
          else if (dueMs < todayMs + 1000 * 60 * 60 * 24) priority = 1; // heute
          else if (dueMs < inThreeDays) priority = 2; // bald
        }
        return { ...t, _priority: priority };
      })
      .sort((a, b) => a._priority - b._priority)
      .slice(0, 6);
  }

  const nextLevelXp = xpForNextLevel(me.level);
  const progress = Math.min(100, Math.round((me.xp / nextLevelXp) * 100));

  return (
    <AppShell>
      {activeLive && (
        <Link href={`/sus/live/${activeLive.sessionId}`}>
          <Card className="mb-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 cursor-pointer hover:shadow-lg transition flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="font-bold">🔴 LIVE-Quiz läuft!</div>
                <div className="text-xs text-white/80">{activeLive.taskTitle} · {activeLive.className}</div>
              </div>
            </div>
            <span className="text-sm font-medium">Beitreten →</span>
          </Card>
        </Link>
      )}

      <Card className="bg-gradient-to-br from-sky-500 to-emerald-500 text-white border-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sky-50 text-sm">Hallo,</p>
            <h1 className="text-3xl font-bold">{me.displayName}</h1>
            <p className="text-sky-50 text-sm mt-1">{levelTitle(me.level)} · Level {me.level}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{me.xp}</div>
            <div className="text-xs text-sky-50">XP gesammelt</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-sky-50 mb-1">
            <span>Fortschritt</span>
            <span>{me.xp} / {nextLevelXp} XP</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 my-6">
        <Card className={`!p-4 text-center relative overflow-hidden ${me.streakDays >= 3 ? "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800" : ""}`}>
          <Flame className={`w-6 h-6 mx-auto ${me.streakDays > 0 ? "text-orange-500" : "text-slate-300"} ${me.streakDays >= 7 ? "animate-pulse" : ""}`} />
          <div className="text-xl font-bold mt-1">{me.streakDays}</div>
          <div className="text-xs text-slate-500">{me.streakDays === 1 ? "Tag Streak" : "Tage Streak"}</div>
          {me.streakDays >= 7 && (
            <div className="absolute top-1 right-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              🔥
            </div>
          )}
        </Card>
        <Card className="!p-4 text-center">
          <Star className="w-6 h-6 mx-auto text-amber-500" />
          <div className="text-xl font-bold mt-1">{me.level}</div>
          <div className="text-xs text-slate-500">Level</div>
        </Card>
        <Card className="!p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto text-violet-500" />
          <div className="text-xl font-bold mt-1">0</div>
          <div className="text-xs text-slate-500">Abzeichen</div>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mb-3">🎯 Heute zu tun</h2>
      {todoTasks.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm">
            Aktuell nichts Offenes — entweder schon alles erledigt oder es gibt keine Aufgaben.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {todoTasks.map((t) => {
            let dueLabel: string | null = null;
            let dueClass = "";
            if (t.dueAt) {
              const dueMs = new Date(t.dueAt).getTime();
              const diffDays = Math.floor((dueMs - Date.now()) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                dueLabel = "überfällig";
                dueClass = "bg-rose-500 text-white";
              } else if (diffDays === 0) {
                dueLabel = "heute";
                dueClass = "bg-amber-500 text-white";
              } else if (diffDays <= 3) {
                dueLabel = `in ${diffDays}T`;
                dueClass = "bg-sky-500 text-white";
              }
            }
            return (
              <Link key={t.id} href={`/sus/aufgaben/${t.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer !py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{t.title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{typeLabels[t.type] ?? t.type}</span>
                          <span>·</span>
                          <Star className="w-3 h-3 text-amber-500" />
                          <span>{t.xpReward} XP</span>
                        </div>
                      </div>
                    </div>
                    {dueLabel && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dueClass}`}>
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {dueLabel}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
