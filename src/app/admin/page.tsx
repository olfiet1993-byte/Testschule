import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  users, tasks, contentItems, classes, classMembers, submissions, usageDays,
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { AdminClient } from "./AdminClient";

/**
 * Admin-Übersicht: Nutzung + Output aller Konten.
 * - Lehrkräfte: erstellte Aufgaben, Bibliotheks-Inhalte, Klassen, Nutzungsdauer
 * - Schüler:innen: Abgaben, Ø-Score, XP/Streak, Nutzungsdauer
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") {
    redirect(session.user.role === "teacher" ? "/dashboard" : "/sus");
  }

  const allUsers = await db.query.users.findMany();
  const teachers = allUsers.filter((u) => u.role === "teacher");
  const students = allUsers.filter((u) => u.role === "student");

  const allTasks = await db.query.tasks.findMany();
  const allContent = await db.query.contentItems.findMany();
  const allClasses = await db.query.classes.findMany();
  const allMembers = await db.query.classMembers.findMany();
  const allSubs = await db.query.submissions.findMany();
  const allUsage = await db.query.usageDays.findMany();

  // Nutzungsminuten je User: gesamt + letzte 7 Tage
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysIso = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
  const usageTotal: Record<string, number> = {};
  const usage7: Record<string, number> = {};
  const usageDayCount: Record<string, number> = {};
  for (const u of allUsage) {
    usageTotal[u.userId] = (usageTotal[u.userId] ?? 0) + u.minutes;
    usageDayCount[u.userId] = (usageDayCount[u.userId] ?? 0) + 1;
    if (u.day >= sevenDaysIso) usage7[u.userId] = (usage7[u.userId] ?? 0) + u.minutes;
  }

  // Klassen-Namen je Schüler (für Anzeige)
  const classNameById = Object.fromEntries(allClasses.map((c) => [c.id, c.name]));
  const classesByStudent: Record<string, string[]> = {};
  for (const m of allMembers) {
    if (!classesByStudent[m.userId]) classesByStudent[m.userId] = [];
    const name = classNameById[m.classId];
    if (name) classesByStudent[m.userId].push(name);
  }

  // Lehrer-Zeilen
  const teacherRows = teachers.map((t) => {
    const myTasks = allTasks.filter((x) => x.authorId === t.id);
    return {
      id: t.id,
      name: t.displayName,
      email: t.email ?? "—",
      tasksCreated: myTasks.length,
      tasksPublished: myTasks.filter((x) => !!x.publishedAt).length,
      libraryItems: allContent.filter((c) => c.ownerId === t.id).length,
      classCount: allClasses.filter((c) => c.teacherId === t.id).length,
      minutesTotal: usageTotal[t.id] ?? 0,
      minutes7: usage7[t.id] ?? 0,
      activeDays: usageDayCount[t.id] ?? 0,
      lastActiveAt: t.lastActiveAt ? new Date(t.lastActiveAt).getTime() : null,
    };
  });

  // Schüler-Zeilen
  const studentRows = students.map((s) => {
    const mySubs = allSubs.filter((x) => x.userId === s.id);
    const scored = mySubs.filter((x) => x.scorePct != null);
    const avg = scored.length
      ? scored.reduce((a, x) => a + (x.scorePct ?? 0), 0) / scored.length
      : null;
    return {
      id: s.id,
      name: s.displayName,
      className: (classesByStudent[s.id] ?? []).join(", ") || "—",
      submissions: mySubs.length,
      avgScore: avg != null ? Math.round(avg) : null,
      perfect: scored.filter((x) => (x.scorePct ?? 0) >= 100).length,
      xp: s.xp,
      level: s.level,
      streak: s.streakDays,
      minutesTotal: usageTotal[s.id] ?? 0,
      minutes7: usage7[s.id] ?? 0,
      activeDays: usageDayCount[s.id] ?? 0,
      lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).getTime() : null,
    };
  });

  // Kopf-Statistiken
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const stats = {
    teachers: teachers.length,
    students: students.length,
    activeToday: allUsers.filter(
      (u) => u.lastActiveAt && new Date(u.lastActiveAt) >= todayStart,
    ).length,
    totalMinutes: Object.values(usageTotal).reduce((a, b) => a + b, 0),
    totalTasks: allTasks.length,
    totalSubmissions: allSubs.length,
  };

  return (
    <AppShell>
      <AdminClient
        stats={stats}
        teachers={JSON.parse(JSON.stringify(teacherRows))}
        students={JSON.parse(JSON.stringify(studentRows))}
      />
    </AppShell>
  );
}
