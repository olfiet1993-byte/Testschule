import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import {
  ArrowLeft, Activity, Flame, CheckCircle2, AlertTriangle, AlertCircle, Clock,
} from "lucide-react";

type Status = "active" | "drifting" | "inactive" | "never";
const STATUS_META: Record<Status, { label: string; icon: any; classes: string }> = {
  active: { label: "Aktiv", icon: CheckCircle2, classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  drifting: { label: "Schleicht zurück", icon: AlertTriangle, classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  inactive: { label: "Inaktiv", icon: AlertCircle, classes: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  never: { label: "Nie aktiv", icon: Clock, classes: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return "vor 1 Woche";
  if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
  if (days < 60) return "vor 1 Monat";
  return `vor ${Math.floor(days / 30)} Monaten`;
}

export default async function ClassActivity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const klass = await db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.teacherId, session.user.id)),
    with: { yearGroup: true },
  });
  if (!klass) notFound();

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarEmoji: users.avatarEmoji,
      avatarColor: users.avatarColor,
      xp: users.xp,
      level: users.level,
      streakDays: users.streakDays,
      lastActiveAt: users.lastActiveAt,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.userId, users.id))
    .where(eq(classMembers.classId, id));

  // Submissions der letzten 7 Tage pro Schüler
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const classTasks = await db.query.tasks.findMany({ where: eq(tasks.classId, id) });
  const recentSubs = classTasks.length && members.length
    ? await db.query.submissions.findMany({
        where: and(
          inArray(submissions.taskId, classTasks.map((t) => t.id)),
          inArray(submissions.userId, members.map((m) => m.id)),
        ),
      })
    : [];

  const recent7Map: Record<string, number> = {};
  for (const s of recentSubs) {
    if (s.submittedAt && new Date(s.submittedAt) >= sevenDaysAgo) {
      recent7Map[s.userId] = (recent7Map[s.userId] ?? 0) + 1;
    }
  }

  // Status berechnen
  const enriched = members.map((m) => {
    const last = m.lastActiveAt ? new Date(m.lastActiveAt) : null;
    let status: Status = "never";
    let daysSince: number | null = null;
    if (last) {
      daysSince = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 2) status = "active";
      else if (daysSince <= 7) status = "drifting";
      else status = "inactive";
    }
    return { ...m, status, daysSince, recent7: recent7Map[m.id] ?? 0 };
  });

  // Sortieren: aktive zuerst nach recent7, dann drifting, dann inaktiv, dann never
  const statusOrder: Record<Status, number> = { active: 0, drifting: 1, inactive: 2, never: 3 };
  enriched.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return b.recent7 - a.recent7;
  });

  const counts = {
    active: enriched.filter((m) => m.status === "active").length,
    drifting: enriched.filter((m) => m.status === "drifting").length,
    inactive: enriched.filter((m) => m.status === "inactive" || m.status === "never").length,
  };

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu {klass.name}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: klass.color }} />
        <div>
          <h1 className="text-2xl font-bold">{klass.name} · Aktivität</h1>
          <p className="text-sm text-slate-500">Wer lernt wie oft — wer braucht Aufmerksamkeit</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="!p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold">{counts.active}</div>
          <div className="text-xs text-slate-500">aktiv (≤ 2 Tage)</div>
        </Card>
        <Card className="!p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">{counts.drifting}</div>
          <div className="text-xs text-slate-500">schleicht zurück</div>
        </Card>
        <Card className="!p-4">
          <AlertCircle className="w-5 h-5 text-rose-500 mb-2" />
          <div className="text-2xl font-bold">{counts.inactive}</div>
          <div className="text-xs text-slate-500">inaktiv (&gt; 7 Tage)</div>
        </Card>
      </div>

      {members.length === 0 ? (
        <Card><p className="text-slate-500">Keine Schüler in der Klasse.</p></Card>
      ) : (
        <div className="space-y-2">
          {enriched.map((m) => {
            const meta = STATUS_META[m.status];
            const Icon = meta.icon;
            return (
              <Link key={m.id} href={`/klassen/${id}/sus/${m.id}`}>
                <Card className="!py-3 hover:shadow-md transition cursor-pointer">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar user={m} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.displayName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>Lvl {m.level} · {m.xp} XP</span>
                        {m.streakDays > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {m.streakDays}
                          </span>
                        )}
                        <span>·</span>
                        <span>{m.recent7} Aufgaben (7T)</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={meta.classes}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {meta.label}
                      </Badge>
                      <div className="text-xs text-slate-400 mt-1">
                        {m.lastActiveAt ? timeAgo(new Date(m.lastActiveAt)) : "—"}
                      </div>
                    </div>
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
