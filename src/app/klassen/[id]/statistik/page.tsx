import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions, topics } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users as UsersIcon, ClipboardList, Star, Download, Printer, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { levelTitle } from "@/lib/utils";

export default async function ClassStats({ params }: { params: Promise<{ id: string }> }) {
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
      id: users.id, displayName: users.displayName, xp: users.xp, level: users.level, streakDays: users.streakDays,
    })
    .from(classMembers).innerJoin(users, eq(classMembers.userId, users.id))
    .where(eq(classMembers.classId, id));

  const classTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: [asc(topics.position), asc(topics.createdAt)],
  });

  const allSubs = classTasks.length && members.length
    ? await db.query.submissions.findMany({
        where: and(
          inArray(submissions.taskId, classTasks.map((t) => t.id)),
          inArray(submissions.userId, members.map((m) => m.id)),
        ),
      })
    : [];

  // Lookup: scoreMap[userId][taskId] = scorePct
  const scoreMap: Record<string, Record<string, number>> = {};
  for (const s of allSubs) {
    if (!scoreMap[s.userId]) scoreMap[s.userId] = {};
    if (s.scorePct != null) scoreMap[s.userId][s.taskId] = s.scorePct;
  }

  // Statistiken
  const totalSubs = allSubs.length;
  const meanScore = allSubs.length
    ? allSubs.filter((s) => s.scorePct != null).reduce((a, s) => a + (s.scorePct ?? 0), 0) /
      (allSubs.filter((s) => s.scorePct != null).length || 1)
    : 0;
  const totalXp = members.reduce((a, m) => a + m.xp, 0);

  // Pro Aufgabe: Mittelwert
  const taskAvg: Record<string, number> = {};
  for (const t of classTasks) {
    const subs = allSubs.filter((s) => s.taskId === t.id && s.scorePct != null);
    taskAvg[t.id] = subs.length ? subs.reduce((a, s) => a + (s.scorePct ?? 0), 0) / subs.length : 0;
  }

  // Tasks nach Themen gruppieren, in Themen-Reihenfolge sortiert
  type TopicGroup = { topicId: string | null; topicTitle: string; tasks: typeof classTasks };
  const groupedTasks: TopicGroup[] = [];
  for (const topic of classTopics) {
    const list = classTasks.filter((t) => t.topicId === topic.id);
    if (list.length > 0) groupedTasks.push({ topicId: topic.id, topicTitle: topic.title, tasks: list });
  }
  const unassigned = classTasks.filter((t) => !t.topicId);
  if (unassigned.length > 0) {
    groupedTasks.push({ topicId: null, topicTitle: "Ohne Thema", tasks: unassigned });
  }

  // Flache, sortierte Reihenfolge für die Datenzeilen
  const orderedTasks = groupedTasks.flatMap((g) => g.tasks);

  // Pro Thema: Mittelwert über alle Aufgaben des Themas + alle Schüler
  const topicAvg: Record<string, number> = {};
  for (const g of groupedTasks) {
    const key = g.topicId ?? "_none";
    const scores: number[] = [];
    for (const t of g.tasks) {
      for (const s of allSubs) {
        if (s.taskId === t.id && s.scorePct != null) scores.push(s.scorePct);
      }
    }
    topicAvg[key] = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  function scoreCell(p: number | undefined) {
    if (p == null) return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-400", value: "–" };
    if (p >= 90) return { bg: "bg-emerald-500", text: "text-white", value: `${Math.round(p)}%` };
    if (p >= 70) return { bg: "bg-emerald-300 dark:bg-emerald-700", text: "text-emerald-900 dark:text-emerald-100", value: `${Math.round(p)}%` };
    if (p >= 50) return { bg: "bg-amber-300 dark:bg-amber-700", text: "text-amber-900 dark:text-amber-100", value: `${Math.round(p)}%` };
    return { bg: "bg-rose-300 dark:bg-rose-800", text: "text-rose-900 dark:text-rose-100", value: `${Math.round(p)}%` };
  }

  return (
    <AppShell>
      <Link href={`/klassen/${klass.id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Klasse
      </Link>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: klass.color }} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{klass.name} · Statistik</h1>
          <p className="text-sm text-slate-500">{klass.yearGroup?.name ?? "—"}</p>
        </div>
        <a href={`/api/klassen/${klass.id}/export`} download>
          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </a>
        <a href={`/api/export/class-stats/${klass.id}`} download>
          <Button variant="secondary" size="sm">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </a>
        <Link href={`/klassen/${klass.id}/notenliste/print`}>
          <Button variant="secondary" size="sm">
            <Printer className="w-4 h-4" /> Druckansicht
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="!p-4">
          <UsersIcon className="w-5 h-5 text-sky-500 mb-2" />
          <div className="text-2xl font-bold">{members.length}</div>
          <div className="text-xs text-slate-500">Schüler:innen</div>
        </Card>
        <Card className="!p-4">
          <ClipboardList className="w-5 h-5 text-violet-500 mb-2" />
          <div className="text-2xl font-bold">{classTasks.length}</div>
          <div className="text-xs text-slate-500">Aufgaben</div>
        </Card>
        <Card className="!p-4">
          <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold">{meanScore.toFixed(0)}%</div>
          <div className="text-xs text-slate-500">Ø Score</div>
        </Card>
        <Card className="!p-4">
          <Star className="w-5 h-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">{totalXp}</div>
          <div className="text-xs text-slate-500">XP gesamt</div>
        </Card>
      </div>

      {(classTasks.length === 0 || members.length === 0) ? (
        <Card>
          <p className="text-slate-500 text-sm">
            {members.length === 0 && "Keine Schüler in der Klasse. "}
            {classTasks.length === 0 && "Noch keine Aufgaben erstellt. "}
            Sobald beides existiert und Schüler Aufgaben gelöst haben, erscheint hier eine Heatmap.
          </p>
        </Card>
      ) : (
        <>
        {/* Themen-Mastery-Heatmap (Schüler × Thema, kompakt) */}
        {classTopics.length > 0 && (
          <Card className="mb-6">
            <h2 className="font-semibold mb-1">Themen-Mastery</h2>
            <p className="text-xs text-slate-500 mb-4">
              Ø % je Schüler:in × Thema. Grün = sicher, Rot = Übungsbedarf, Grau = noch nichts gelöst.
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-white dark:bg-slate-900 min-w-[160px]">Schüler:in</th>
                    {classTopics.map((t) => (
                      <th key={t.id} className="text-xs p-2 text-violet-700 dark:text-violet-300 font-medium min-w-[110px]">
                        {t.title}
                      </th>
                    ))}
                    <th className="text-xs p-2 text-slate-500 font-medium min-w-[80px]">Ø</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    // pro Thema mittel
                    const perTopic: number[] = [];
                    const cells = classTopics.map((topic) => {
                      const tids = classTasks.filter((t) => t.topicId === topic.id).map((t) => t.id);
                      const scores = tids
                        .map((tid) => scoreMap[m.id]?.[tid])
                        .filter((p): p is number => p != null);
                      if (scores.length === 0) return null;
                      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                      perTopic.push(avg);
                      return avg;
                    });
                    const overall = perTopic.length
                      ? perTopic.reduce((a, b) => a + b, 0) / perTopic.length
                      : null;
                    return (
                      <tr key={m.id}>
                        <td className="p-2 sticky left-0 bg-white dark:bg-slate-900 font-medium truncate">
                          {m.displayName}
                        </td>
                        {cells.map((avg, ci) => {
                          const cell = scoreCell(avg ?? undefined);
                          return (
                            <td key={ci} className="p-1">
                              <div
                                className={`${cell.bg} ${cell.text} h-9 rounded flex items-center justify-center text-xs font-semibold`}
                                title={avg != null ? `${avg.toFixed(0)}%` : "noch nichts gelöst"}
                              >
                                {cell.value}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-1">
                          {overall != null ? (
                            <div className={`${scoreCell(overall).bg} ${scoreCell(overall).text} h-9 rounded flex items-center justify-center text-xs font-bold ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-700`}>
                              {Math.round(overall)}%
                            </div>
                          ) : (
                            <div className="text-slate-300 text-xs h-9 flex items-center justify-center">–</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-semibold mb-3">Heatmap: Schüler:innen × Aufgaben (nach Thema gruppiert)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-0">
              <thead>
                {/* Zeile 1: Themen-Header über die jeweiligen Spalten */}
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-white dark:bg-slate-900 align-bottom"></th>
                  {groupedTasks.map((g, gi) => (
                    <th
                      key={g.topicId ?? "_none"}
                      colSpan={g.tasks.length}
                      className={`text-center text-xs font-semibold px-2 py-1 border-b border-slate-200 dark:border-slate-800 ${
                        g.topicId ? "bg-violet-50/60 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300" : "bg-slate-50 dark:bg-slate-800/40 text-slate-500"
                      } ${gi > 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-700" : ""}`}
                    >
                      {g.topicTitle}
                    </th>
                  ))}
                  <th className="text-center p-2 text-xs font-medium align-bottom"></th>
                </tr>
                {/* Zeile 2: Aufgaben-Titel */}
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-white dark:bg-slate-900">Schüler:in</th>
                  {groupedTasks.map((g, gi) =>
                    g.tasks.map((t, ti) => (
                      <th
                        key={t.id}
                        className={`text-left p-1 text-xs font-medium ${
                          gi > 0 && ti === 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-700" : ""
                        }`}
                      >
                        <div className="-rotate-45 origin-bottom-left whitespace-nowrap pl-4 max-w-[12rem]" title={t.title}>
                          {t.title.length > 25 ? t.title.slice(0, 25) + "…" : t.title}
                        </div>
                      </th>
                    ))
                  )}
                  <th className="text-center p-2 text-xs font-medium">Ø</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const scores = orderedTasks
                    .map((t) => scoreMap[m.id]?.[t.id])
                    .filter((v) => v != null) as number[];
                  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                  return (
                    <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="p-2 sticky left-0 bg-white dark:bg-slate-900">
                        <div className="font-medium">{m.displayName}</div>
                        <div className="text-xs text-slate-500">Lvl {m.level} · {m.xp} XP</div>
                      </td>
                      {groupedTasks.map((g, gi) =>
                        g.tasks.map((t, ti) => {
                          const cell = scoreCell(scoreMap[m.id]?.[t.id]);
                          return (
                            <td
                              key={t.id}
                              className={`p-1 ${gi > 0 && ti === 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-700" : ""}`}
                            >
                              <div className={`w-12 h-9 rounded flex items-center justify-center text-xs font-bold ${cell.bg} ${cell.text}`}>
                                {cell.value}
                              </div>
                            </td>
                          );
                        })
                      )}
                      <td className="p-2 text-center font-semibold">
                        {avg != null ? `${avg.toFixed(0)}%` : "–"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <td className="p-2 font-semibold sticky left-0 bg-slate-50 dark:bg-slate-800">Ø Aufgabe</td>
                  {groupedTasks.map((g, gi) =>
                    g.tasks.map((t, ti) => {
                      const cell = scoreCell(taskAvg[t.id] || undefined);
                      return (
                        <td
                          key={t.id}
                          className={`p-1 ${gi > 0 && ti === 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-700" : ""}`}
                        >
                          <div className={`w-12 h-9 rounded flex items-center justify-center text-xs font-bold ${cell.bg} ${cell.text}`}>
                            {cell.value}
                          </div>
                        </td>
                      );
                    })
                  )}
                  <td className="p-2 text-center font-bold">{meanScore.toFixed(0)}%</td>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <td className="p-2 font-semibold sticky left-0 bg-slate-100 dark:bg-slate-800">Ø Thema</td>
                  {groupedTasks.map((g, gi) => {
                    const cell = scoreCell(topicAvg[g.topicId ?? "_none"] || undefined);
                    return (
                      <td
                        key={g.topicId ?? "_none"}
                        colSpan={g.tasks.length}
                        className={`p-1 ${gi > 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-700" : ""}`}
                      >
                        <div className={`mx-auto h-9 rounded flex items-center justify-center text-xs font-bold ${cell.bg} ${cell.text}`}>
                          {cell.value}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-4 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />≥90%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 dark:bg-emerald-700" />70–89%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-700" />50–69%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-300 dark:bg-rose-800" />&lt;50%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800" />nicht abgegeben</span>
          </div>
        </Card>
        </>
      )}
    </AppShell>
  );
}
