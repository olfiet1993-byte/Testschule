import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classMembers, scheduleSlots, classes, topics, learningPaths, learningPathItems, tasks, submissions } from "@/db/schema";
import { eq, inArray, asc, and } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { CalendarDays, Clock, MapPin, BookMarked, Map, CheckCircle2, Circle } from "lucide-react";
import { DIFFICULTY_LABEL } from "@/components/DifficultySelect";
import Link from "next/link";

const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const TYPE_EMOJI: Record<string, string> = {
  quiz: "❓",
  flashcards: "🃏",
  cloze: "✍️",
  case: "🏥",
  image_hotspot: "🖼️",
};

export default async function Wochenplan() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, session.user.id),
  });
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) {
    return (
      <AppShell>
        <p className="text-slate-500">Du bist in keiner Klasse.</p>
      </AppShell>
    );
  }

  const myClasses = await db.query.classes.findMany({ where: inArray(classes.id, classIds) });
  const classById = Object.fromEntries(myClasses.map((c) => [c.id, c]));

  const slots = await db.query.scheduleSlots.findMany({
    where: inArray(scheduleSlots.classId, classIds),
    orderBy: [asc(scheduleSlots.weekday), asc(scheduleSlots.startTime)],
  });

  // Aktive Lernpfade
  const allPaths = await db.query.learningPaths.findMany({
    where: and(inArray(learningPaths.classId, classIds), eq(learningPaths.archived, false)),
  });
  const activePaths = allPaths
    .map((p) => {
      const start = new Date(p.startsOn + "T00:00:00");
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const week = Math.floor(diffDays / 7) + 1;
      return { ...p, currentWeek: week };
    })
    .filter((p) => p.currentWeek >= 1 && p.currentWeek <= p.numWeeks);

  // Items + Aufgaben für aktuelle Wochen
  const allWeekItems = activePaths.length
    ? await db.query.learningPathItems.findMany({
        where: inArray(learningPathItems.pathId, activePaths.map((p) => p.id)),
        orderBy: [asc(learningPathItems.order)],
      })
    : [];
  const currentWeekItems = allWeekItems.filter((it) => {
    const p = activePaths.find((pp) => pp.id === it.pathId);
    return p && it.weekIndex === p.currentWeek;
  });
  const taskIds = Array.from(new Set(currentWeekItems.map((i) => i.taskId)));
  const taskMap = taskIds.length
    ? Object.fromEntries((await db.query.tasks.findMany({ where: inArray(tasks.id, taskIds) })).map((t) => [t.id, t]))
    : {};
  const mySubs = taskIds.length
    ? await db.query.submissions.findMany({
        where: and(eq(submissions.userId, session.user.id), inArray(submissions.taskId, taskIds)),
      })
    : [];
  const doneTaskIds = new Set(mySubs.map((s) => s.taskId));
  const topicIds = Array.from(new Set(slots.map((s) => s.topicId).filter(Boolean) as string[]));
  const topicMap = topicIds.length
    ? Object.fromEntries((await db.query.topics.findMany({ where: inArray(topics.id, topicIds) })).map((t) => [t.id, t]))
    : {};

  const byDay: Record<number, any[]> = {};
  for (const s of slots) {
    if (!byDay[s.weekday]) byDay[s.weekday] = [];
    byDay[s.weekday].push(s);
  }

  // Heute = (Mo=0..So=6)
  const today = new Date();
  const todayDay = (today.getDay() + 6) % 7;

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <CalendarDays className="w-6 h-6 text-sky-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mein Wochenplan</h1>
          <p className="text-sm text-slate-500">
            Stundenplan aus deinen {myClasses.length} Klassen
          </p>
        </div>
      </div>

      {/* Lernpfad-Sektion */}
      {activePaths.length > 0 && (
        <div className="mb-6 space-y-3">
          {activePaths.map((p) => {
            const items = currentWeekItems.filter((it) => it.pathId === p.id);
            const done = items.filter((it) => doneTaskIds.has(it.taskId)).length;
            const total = items.length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const klass = classById[p.classId];
            return (
              <Card key={p.id} className="border-l-4" style={{ borderLeftColor: klass?.color ?? "#8b5cf6" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <Map className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="font-bold">{p.name}</h2>
                      <p className="text-xs text-slate-500">
                        {klass?.name} · Woche {p.currentWeek} von {p.numWeeks}
                      </p>
                    </div>
                  </div>
                  <Badge className={pct === 100 ? "bg-emerald-500 text-white" : "bg-sky-100 text-sky-700"}>
                    {done} / {total}
                  </Badge>
                </div>

                {/* Fortschrittsbalken */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-violet-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Diese Woche keine Aufgaben.</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((it) => {
                      const t = taskMap[it.taskId];
                      if (!t) return null;
                      const isDone = doneTaskIds.has(it.taskId);
                      const diff = t.difficulty ? DIFFICULTY_LABEL[t.difficulty] : null;
                      return (
                        <li key={it.id}>
                          <Link
                            href={`/sus/aufgaben/${t.id}`}
                            className={`flex items-center gap-2 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                              isDone ? "opacity-60" : ""
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            )}
                            <span className="text-sm flex-1 truncate">
                              {TYPE_EMOJI[t.type] ?? "📝"} {t.title}
                            </span>
                            {diff && <Badge className={`text-[10px] ${diff.color}`}>{diff.label}</Badge>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {slots.length === 0 && activePaths.length === 0 ? (
        <Card className="text-center py-10">
          <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Deine Lehrkraft hat noch keinen Stundenplan oder Lernpfad hinterlegt.</p>
        </Card>
      ) : slots.length === 0 ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {WEEKDAYS_LONG.map((dayName, dayIdx) => {
            const daySlots = byDay[dayIdx] ?? [];
            if (daySlots.length === 0) return null;
            const isToday = dayIdx === todayDay;
            return (
              <Card
                key={dayIdx}
                className={isToday ? "border-sky-300 bg-sky-50/30 dark:bg-sky-900/10" : ""}
              >
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className={isToday ? "text-sky-600" : "text-slate-500"}>{dayName}</span>
                  {isToday && <Badge className="bg-sky-500 text-white">heute</Badge>}
                </h3>
                <ul className="space-y-2">
                  {daySlots.map((s) => {
                    const klass = classById[s.classId];
                    const topic = s.topicId ? topicMap[s.topicId] : null;
                    return (
                      <li
                        key={s.id}
                        className="p-3 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-800/50"
                        style={{ borderLeftColor: klass?.color ?? "#888" }}
                      >
                        <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" />
                          {s.startTime}{s.endTime && ` – ${s.endTime}`}
                        </div>
                        <div className="font-medium text-sm">{s.title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span style={{ color: klass?.color }} className="font-medium">{klass?.name}</span>
                          {topic && (
                            <span className="text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">
                              <BookMarked className="w-3 h-3" /> {topic.title}
                            </span>
                          )}
                          {s.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {s.location}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
