import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  classes, classTeachers, tasks, submissions, scheduleSlots, topics, classMembers, users,
} from "@/db/schema";
import { eq, inArray, and, gte, lte, isNull, or, desc, asc } from "drizzle-orm";
import { KlassenzimmerClient } from "./KlassenzimmerClient";

/**
 * Lehrer-Klassenzimmer-Panel: 5 Tage Mo-Fr als Tabs (oben),
 * darunter Tagesansicht (Slots + fällige Aufgaben),
 * unten Backlog (Aufgaben ohne dueAt).
 *
 * Server Component — lädt alles je Request.
 */
export async function KlassenzimmerPanel() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") return null;
  const myId = session.user.id;

  // Klassen, die ich verwalte (eigene + Co)
  const owned = await db.query.classes.findMany({ where: eq(classes.teacherId, myId) });
  const co = await db.query.classTeachers.findMany({ where: eq(classTeachers.userId, myId) });
  const myClassIds = Array.from(new Set([...owned.map((c) => c.id), ...co.map((c) => c.classId)]));
  if (myClassIds.length === 0) return null;

  const myClasses = await db.query.classes.findMany({ where: inArray(classes.id, myClassIds) });

  // Aktuelle Woche Mo-Fr bestimmen (in lokaler Zeit — kein UTC-Shift)
  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // 0=Mo
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - todayDow);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  // Lokales YYYY-MM-DD (nicht toISOString, das wäre UTC)
  const toLocalIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const days: Array<{ date: string; weekday: number; label: string }> = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push({
      date: toLocalIso(d),
      weekday: i,
      label: ["Mo", "Di", "Mi", "Do", "Fr"][i],
    });
  }

  // Slots (Stundenplan) — wir filtern auf weekday < 5 (Mo-Fr)
  const slots = await db.query.scheduleSlots.findMany({
    where: inArray(scheduleSlots.classId, myClassIds),
    orderBy: [asc(scheduleSlots.weekday), asc(scheduleSlots.startTime)],
  });
  const topicIds = Array.from(new Set(slots.map((s) => s.topicId).filter(Boolean) as string[]));
  const topicMap = topicIds.length
    ? Object.fromEntries((await db.query.topics.findMany({ where: inArray(topics.id, topicIds) })).map((t) => [t.id, t]))
    : {};

  // Aufgaben mit dueAt in Mo-Fr-Range
  const weekTasks = await db.query.tasks.findMany({
    where: and(
      inArray(tasks.classId, myClassIds),
      gte(tasks.dueAt, monday),
      lte(tasks.dueAt, friday),
    ),
    orderBy: [asc(tasks.dueAt)],
  });
  const weekTaskIds = weekTasks.map((t) => t.id);

  // Abgaben-Count pro Aufgabe (nur Wochen-Aufgaben)
  const weekSubs = weekTaskIds.length
    ? await db.query.submissions.findMany({ where: inArray(submissions.taskId, weekTaskIds) })
    : [];
  const submissionCount: Record<string, number> = {};
  for (const s of weekSubs) {
    submissionCount[s.taskId] = (submissionCount[s.taskId] ?? 0) + 1;
  }

  // Mitgliederzahl pro Klasse
  const memberRows = await db.query.classMembers.findMany({ where: inArray(classMembers.classId, myClassIds) });
  const memberCount: Record<string, number> = {};
  for (const m of memberRows) memberCount[m.classId] = (memberCount[m.classId] ?? 0) + 1;

  // Backlog: veröffentlichte Aufgaben ohne dueAt + Entwürfe der letzten 14 Tage
  const fortnightAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const backlogTasks = await db.query.tasks.findMany({
    where: and(
      inArray(tasks.classId, myClassIds),
      isNull(tasks.dueAt),
      or(
        // Veröffentlicht
        // (publishedAt nicht null)
        // Drizzle: isNotNull
        // wir holen alles ohne dueAt und filtern Client-seitig
        gte(tasks.createdAt, fortnightAgo),
      ),
    ),
    orderBy: [desc(tasks.createdAt)],
    limit: 50,
  });

  const classNameById = Object.fromEntries(myClasses.map((c) => [c.id, c.name]));
  const classColorById = Object.fromEntries(myClasses.map((c) => [c.id, c.color]));

  const todayIso = toLocalIso(today);

  return (
    <KlassenzimmerClient
      days={days}
      todayIso={todayIso}
      slots={JSON.parse(JSON.stringify(slots))}
      topicMap={JSON.parse(JSON.stringify(topicMap))}
      weekTasks={JSON.parse(JSON.stringify(weekTasks))}
      backlog={JSON.parse(JSON.stringify(backlogTasks))}
      classNameById={classNameById}
      classColorById={classColorById}
      memberCount={memberCount}
      submissionCount={submissionCount}
    />
  );
}
