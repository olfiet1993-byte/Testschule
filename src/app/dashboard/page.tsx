import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classes, classMembers, users, tasks, submissions,
  questions, auditLog,
} from "@/db/schema";
import { eq, and, count, gte, inArray, desc, isNull, isNotNull, sql } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import {
  Plus, Users, ClipboardList, Library, ArrowUpRight, Activity, Flame, MessageCircle,
  AlertTriangle, GraduationCap, History, TrendingUp, Sparkles, Clock,
} from "lucide-react";

const ACTION_LABEL: Record<string, string> = {
  "task.create": "neue Aufgabe",
  "task.publish": "veröffentlicht",
  "task.unpublish": "zurückgenommen",
  "task.delete": "gelöscht",
  "class.create": "Klasse angelegt",
  "class.delete": "Klasse entfernt",
  "member.add": "Schüler hinzugefügt",
  "member.remove": "Schüler entfernt",
  "invite.send": "Einladung verschickt",
  "invite.accept": "Einladung angenommen",
  "backup.run": "Backup",
};

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "gerade eben";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  return `vor ${Math.floor(sec / 86400)} T`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  const myId = session.user.id;
  const schoolId = session.user.schoolId;

  // Klassen + Mitgliederzahlen
  const myClasses = await db.query.classes.findMany({
    where: eq(classes.teacherId, myId),
    with: { yearGroup: true },
  });
  const classIds = myClasses.map((c) => c.id);

  const memberCounts = await Promise.all(
    myClasses.map(async (c) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(classMembers)
        .where(eq(classMembers.classId, c.id));
      return { classId: c.id, count: value };
    }),
  );
  const memberMap = Object.fromEntries(memberCounts.map((m) => [m.classId, m.count]));
  const totalStudents = Object.values(memberMap).reduce((a, b) => a + b, 0);

  // Aufgaben in meinen Klassen
  const myTasks = classIds.length
    ? await db.query.tasks.findMany({ where: inArray(tasks.classId, classIds) })
    : [];
  const totalTasks = myTasks.length;
  const taskIds = myTasks.map((t) => t.id);

  // Abgaben in meinen Klassen
  const mySubs = taskIds.length
    ? await db.query.submissions.findMany({ where: inArray(submissions.taskId, taskIds) })
    : [];
  const totalSubs = mySubs.length;

  // Heute-Stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const subsToday = mySubs.filter((s) => s.submittedAt && new Date(s.submittedAt) >= todayStart).length;
  const activeStudentsToday = new Set(
    mySubs.filter((s) => s.submittedAt && new Date(s.submittedAt) >= todayStart).map((s) => s.userId),
  ).size;

  // Forum: ungelöste Fragen in meinen Klassen
  const unresolvedQuestions = classIds.length
    ? await db
        .select({
          id: questions.id,
          title: questions.title,
          classId: questions.classId,
          createdAt: questions.createdAt,
          authorName: users.displayName,
        })
        .from(questions)
        .innerJoin(users, eq(questions.authorId, users.id))
        .where(and(inArray(questions.classId, classIds), eq(questions.resolved, false)))
        .orderBy(desc(questions.createdAt))
        .limit(5)
    : [];

  // Klausuren mit Abgaben aber ohne Auflösung
  const examWaiting = myTasks.filter((t) => t.examMode && !t.answersRevealedAt).filter((t) => {
    return mySubs.some((s) => s.taskId === t.id);
  });

  // Inaktive Schüler (letzte Aktivität > 7 Tage oder nie)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allStudentIds = Array.from(new Set(
    (classIds.length
      ? await db.query.classMembers.findMany({ where: inArray(classMembers.classId, classIds) })
      : []
    ).map((m) => m.userId)
  ));
  const studentRows = allStudentIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, allStudentIds) })
    : [];
  const inactiveStudents = studentRows.filter((u) => {
    if (!u.lastActiveAt) return true;
    return new Date(u.lastActiveAt) < sevenDaysAgo;
  }).slice(0, 5);

  // Audit-Log: letzte 8 Einträge
  const lastEvents = await db.query.auditLog.findMany({
    where: eq(auditLog.schoolId, schoolId),
    orderBy: [desc(auditLog.createdAt)],
    limit: 8,
  });

  const classNameById = Object.fromEntries(myClasses.map((c) => [c.id, c.name]));

  return (
    <AppShell>
      {/* Hero Greeting */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-brand-grad text-white p-6 md:p-8 shadow-lift">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Willkommen, {session.user.displayName} 👋
            </h1>
            <p className="text-sm text-white/85">
              {totalStudents} Schüler:innen in {myClasses.length} Klassen · {totalTasks} Aufgaben
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{subsToday}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/70">Abgaben heute</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{activeStudentsToday}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/70">aktiv heute</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat-Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard icon={Users} label="Klassen" value={myClasses.length} color="sky" />
        <StatCard icon={Users} label="Schüler:innen" value={totalStudents} color="emerald" />
        <StatCard icon={ClipboardList} label="Aufgaben" value={totalTasks} color="amber" />
        <StatCard icon={Library} label="Abgaben" value={totalSubs} color="violet" />
      </div>

      {/* Braucht Aufmerksamkeit */}
      {(unresolvedQuestions.length > 0 || examWaiting.length > 0 || inactiveStudents.length > 0) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Braucht Aufmerksamkeit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {unresolvedQuestions.length > 0 && (
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-sky-500" />
                  <span className="font-semibold text-sm">Offene Fragen ({unresolvedQuestions.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {unresolvedQuestions.map((q) => (
                    <li key={q.id}>
                      <Link href={`/forum/${q.id}`} className="hover:text-sky-600">
                        <div className="font-medium truncate">{q.title}</div>
                        <div className="text-slate-500">{q.authorName} · {classNameById[q.classId]}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {examWaiting.length > 0 && (
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold text-sm">Klausur-Auflösung freigeben ({examWaiting.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {examWaiting.slice(0, 5).map((t) => (
                    <li key={t.id}>
                      <Link href={`/aufgaben`} className="hover:text-sky-600">
                        <div className="font-medium truncate">{t.title}</div>
                        <div className="text-slate-500">{classNameById[t.classId]}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {inactiveStudents.length > 0 && (
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold text-sm">Inaktive SuS ({inactiveStudents.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {inactiveStudents.map((u) => (
                    <li key={u.id} className="flex items-center gap-2">
                      <Avatar user={u} size={20} />
                      <span className="font-medium truncate flex-1">{u.displayName}</span>
                      <span className="text-slate-400">
                        {u.lastActiveAt ? timeAgo(new Date(u.lastActiveAt)) : "nie"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Klassen */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Meine Klassen</h2>
            <Link href="/klassen" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
              Verwalten <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myClasses.map((c) => (
              <Link key={c.id} href={`/klassen/${c.id}`}>
                <Card className="hover:shadow-md transition cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: c.color }} />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{c.name}</h3>
                      <p className="text-xs text-slate-500">{c.yearGroup?.name ?? "—"}</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {c.inviteCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span><Users className="inline w-3 h-3 mr-1" />{memberMap[c.id] ?? 0} SuS</span>
                  </div>
                </Card>
              </Link>
            ))}
            <Link href="/klassen">
              <Card className="hover:shadow-md transition cursor-pointer border-dashed border-2 flex flex-col items-center justify-center text-slate-400 hover:text-sky-600 hover:border-sky-400 min-h-[140px]">
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-medium">Neue Klasse</span>
              </Card>
            </Link>
          </div>
        </div>

        {/* Letzte Aktivitäten */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5" /> Letztes
            </h2>
            <Link href="/audit" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
              Alle <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          {lastEvents.length === 0 ? (
            <Card><p className="text-sm text-slate-500">Noch keine Aktivitäten.</p></Card>
          ) : (
            <Card className="!p-0">
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {lastEvents.map((e) => (
                  <li key={e.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Clock className="w-3 h-3 text-slate-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">
                          <strong className="text-slate-700 dark:text-slate-300">{e.actorName}</strong>{" · "}
                          {ACTION_LABEL[e.action] ?? e.action}{" · "}
                          {timeAgo(new Date(e.createdAt))}
                        </div>
                        <div className="text-sm mt-0.5 line-clamp-2">{e.summary}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "sky" | "emerald" | "amber" | "violet";
}) {
  const colors = {
    sky: "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  } as const;
  return (
    <Card className="!p-4 hover-lift">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-3 shadow-sm`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </Card>
  );
}
