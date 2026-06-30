/**
 * Content-Agent — Phase 2
 *
 * Analysiert die App-Daten und erkennt automatisch:
 * 1. Themen ohne Aufgaben (Lücken im Lernmaterial)
 * 2. Quiz-Fragen mit hoher Fehlerrate (Verbesserungsbedarf)
 * 3. Klassen ohne aktuelle Aufgaben (> 14 Tage keine neue Aufgabe)
 *
 * Für jeden Befund wird ein Task in die agent_tasks Queue geschrieben.
 * Der Dev-Agent oder ein menschlicher Review entscheidet dann über Umsetzung.
 *
 * Aufruf: automatisch durch Orchestrator täglich, oder manuell:
 *   npx tsx src/lib/agent/content-agent.ts
 */

import { db } from "@/db";
import { tasks, submissions, mistakes, topics, classes, agentTasks, classMembers } from "@/db/schema";
import { sql, eq, gte, lt, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Schwellenwerte ───────────────────────────────────────────────────────────

const THRESHOLDS = {
  // Thema gilt als "ohne Aufgaben" wenn weniger als diese Zahl
  MIN_TASKS_PER_TOPIC: 1,
  // Fehlerrate ab der eine Quiz-Frage als problematisch gilt (0–1)
  HIGH_ERROR_RATE: 0.6,
  // Klasse gilt als inaktiv wenn seit so vielen Tagen keine neue Aufgabe
  INACTIVE_CLASS_DAYS: 14,
  // Mindest-Abgaben bevor Fehlerrate gewertet wird (zu wenig = nicht aussagekräftig)
  MIN_SUBMISSIONS_FOR_ANALYSIS: 5,
};

// ─── Analyse-Ergebnis ─────────────────────────────────────────────────────────

export interface ContentAnalysisResult {
  topicsWithoutTasks: { topicId: string; topicTitle: string; classId: string }[];
  highErrorTasks: { taskId: string; taskTitle: string; errorRate: number; submissionCount: number }[];
  inactiveClasses: { classId: string; className: string; daysSinceLastTask: number }[];
  tasksQueued: number;
}

// ─── Haupt-Analyse ────────────────────────────────────────────────────────────

export async function runContentAgent(): Promise<ContentAnalysisResult> {
  console.log("[Content-Agent] Starte Analyse...");

  const [topicsWithoutTasks, highErrorTasks, inactiveClasses] = await Promise.all([
    findTopicsWithoutTasks(),
    findHighErrorTasks(),
    findInactiveClasses(),
  ]);

  // Tasks in Queue schreiben
  let tasksQueued = 0;
  tasksQueued += await queueTopicGapTasks(topicsWithoutTasks);
  tasksQueued += await queueErrorRateTasks(highErrorTasks);
  tasksQueued += await queueInactiveClassTasks(inactiveClasses);

  console.log(`[Content-Agent] Analyse abgeschlossen. ${tasksQueued} Tasks in Queue.`);

  return { topicsWithoutTasks, highErrorTasks, inactiveClasses, tasksQueued };
}

// ─── 1. Themen ohne Aufgaben ──────────────────────────────────────────────────

async function findTopicsWithoutTasks() {
  // Alle Themen holen
  const allTopics = await db
    .select({ id: topics.id, title: topics.title, classId: topics.classId })
    .from(topics);

  // Aufgaben je Thema zählen
  const taskCounts = await db
    .select({
      topicId: tasks.topicId,
      cnt: count(tasks.id),
    })
    .from(tasks)
    .groupBy(tasks.topicId);

  const countMap = new Map(taskCounts.map((t) => [t.topicId, t.cnt]));

  const gaps = allTopics.filter(
    (t) => (countMap.get(t.id) ?? 0) < THRESHOLDS.MIN_TASKS_PER_TOPIC
  );

  console.log(`[Content-Agent] ${gaps.length} Themen ohne Aufgaben gefunden.`);
  return gaps.map((t) => ({ topicId: t.id, topicTitle: t.title, classId: t.classId }));
}

// ─── 2. Aufgaben mit hoher Fehlerrate ────────────────────────────────────────

async function findHighErrorTasks() {
  // Fehler-Häufung je Aufgabe aus mistakes-Tabelle
  const errorCounts = await db
    .select({
      taskId: mistakes.taskId,
      errorCount: count(mistakes.id),
    })
    .from(mistakes)
    .groupBy(mistakes.taskId);

  // Abgaben je Aufgabe
  const submissionCounts = await db
    .select({
      taskId: submissions.taskId,
      subCount: count(submissions.id),
    })
    .from(submissions)
    .groupBy(submissions.taskId);

  const subMap = new Map(submissionCounts.map((s) => [s.taskId, s.subCount]));

  // Aufgabentitel
  const allTasks = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks);
  const taskMap = new Map(allTasks.map((t) => [t.id, t.title]));

  const highError = errorCounts
    .map((e) => {
      const subCount = subMap.get(e.taskId) ?? 0;
      if (subCount < THRESHOLDS.MIN_SUBMISSIONS_FOR_ANALYSIS) return null;
      const errorRate = e.errorCount / subCount;
      if (errorRate < THRESHOLDS.HIGH_ERROR_RATE) return null;
      return {
        taskId: e.taskId,
        taskTitle: taskMap.get(e.taskId) ?? "(unbekannt)",
        errorRate: Math.round(errorRate * 100) / 100,
        submissionCount: subCount,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10); // max 10 pro Lauf

  console.log(`[Content-Agent] ${highError.length} Aufgaben mit hoher Fehlerrate gefunden.`);
  return highError;
}

// ─── 3. Inaktive Klassen ─────────────────────────────────────────────────────

async function findInactiveClasses() {
  const cutoff = new Date(Date.now() - THRESHOLDS.INACTIVE_CLASS_DAYS * 86_400_000);

  // Letzte Aufgabe je Klasse
  const lastTaskPerClass = await db
    .select({
      classId: tasks.classId,
      lastTask: sql<number>`MAX(${tasks.createdAt})`,
    })
    .from(tasks)
    .groupBy(tasks.classId);

  const lastTaskMap = new Map(lastTaskPerClass.map((t) => [t.classId, t.lastTask]));

  // Alle Klassen
  const allClasses = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes);

  // Klassen mit Mitgliedern (keine leeren Klassen melden)
  const classMemberCounts = await db
    .select({ classId: classMembers.classId, cnt: count(classMembers.userId) })
    .from(classMembers)
    .groupBy(classMembers.classId);
  const memberMap = new Map(classMemberCounts.map((c) => [c.classId, c.cnt]));

  const inactive = allClasses
    .filter((c) => {
      if ((memberMap.get(c.id) ?? 0) === 0) return false; // leere Klasse ignorieren
      const last = lastTaskMap.get(c.id);
      if (!last) return true; // noch nie eine Aufgabe
      return last < cutoff.getTime();
    })
    .map((c) => {
      const last = lastTaskMap.get(c.id);
      const daysSince = last
        ? Math.floor((Date.now() - last) / 86_400_000)
        : 999;
      return { classId: c.id, className: c.name, daysSinceLastTask: daysSince };
    });

  console.log(`[Content-Agent] ${inactive.length} inaktive Klassen gefunden.`);
  return inactive;
}

// ─── Tasks in Queue schreiben ─────────────────────────────────────────────────

async function queueTopicGapTasks(
  gaps: { topicId: string; topicTitle: string; classId: string }[]
) {
  if (gaps.length === 0) return 0;

  // Bereits offene Tasks für diese Themen prüfen (nicht doppeln)
  const existing = await db
    .select({ id: agentTasks.id, description: agentTasks.description })
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.type, "feature"),
        eq(agentTasks.status, "pending")
      )
    );
  const existingDesc = new Set(existing.map((e) => e.description));

  let queued = 0;
  for (const gap of gaps.slice(0, 5)) { // max 5 pro Lauf
    const desc = `Thema "${gap.topicTitle}" (ID: ${gap.topicId}) hat keine Aufgaben. Erstelle mindestens 1 Quiz-Aufgabe mit 4 Fragen passend zum Thema.`;
    if (existingDesc.has(desc)) continue;

    await db.insert(agentTasks).values({
      id: nanoid(12),
      createdAt: new Date(),
      updatedAt: new Date(),
      type: "feature",
      status: "pending",
      priority: 7,
      title: `Aufgabe für Thema erstellen: "${gap.topicTitle}"`,
      description: desc,
      submittedBy: "content-agent",
    });
    queued++;
  }
  return queued;
}

async function queueErrorRateTasks(
  items: { taskId: string; taskTitle: string; errorRate: number; submissionCount: number }[]
) {
  if (items.length === 0) return 0;
  let queued = 0;
  for (const item of items.slice(0, 3)) {
    const desc = `Aufgabe "${item.taskTitle}" (ID: ${item.taskId}) hat eine Fehlerrate von ${Math.round(item.errorRate * 100)}% bei ${item.submissionCount} Abgaben. Überprüfe Schwierigkeit, Formulierung und Distraktoren — ggf. Erklärungen verbessern oder Fragen überarbeiten.`;

    const existing = await db
      .select({ id: agentTasks.id })
      .from(agentTasks)
      .where(and(eq(agentTasks.status, "pending"), sql`description LIKE ${'%' + item.taskId + '%'}`))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(agentTasks).values({
      id: nanoid(12),
      createdAt: new Date(),
      updatedAt: new Date(),
      type: "bugfix",
      status: "pending",
      priority: 3,
      title: `Hohe Fehlerrate: "${item.taskTitle}" (${Math.round(item.errorRate * 100)}%)`,
      description: desc,
      affectedFiles: JSON.stringify([`src/lib/actions/aiTaskGen.ts`]),
      submittedBy: "content-agent",
    });
    queued++;
  }
  return queued;
}

async function queueInactiveClassTasks(
  items: { classId: string; className: string; daysSinceLastTask: number }[]
) {
  if (items.length === 0) return 0;
  let queued = 0;
  for (const item of items.slice(0, 3)) {
    const desc = `Klasse "${item.className}" (ID: ${item.classId}) hat seit ${item.daysSinceLastTask} Tagen keine neue Aufgabe. Erstelle eine neue Aufgabe passend zum aktuellen Lernstand der Klasse.`;

    const existing = await db
      .select({ id: agentTasks.id })
      .from(agentTasks)
      .where(and(eq(agentTasks.status, "pending"), sql`description LIKE ${'%' + item.classId + '%'}`))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(agentTasks).values({
      id: nanoid(12),
      createdAt: new Date(),
      updatedAt: new Date(),
      type: "feature",
      status: "pending",
      priority: 6,
      title: `Inaktive Klasse: neue Aufgabe für "${item.className}"`,
      description: desc,
      submittedBy: "content-agent",
    });
    queued++;
  }
  return queued;
}

// ─── CLI-Einstieg ─────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("content-agent.ts")) {
  runContentAgent()
    .then((r) => {
      console.log("\n── Analyse-Ergebnis ──");
      console.log(`Themen ohne Aufgaben: ${r.topicsWithoutTasks.length}`);
      console.log(`Aufgaben mit hoher Fehlerrate: ${r.highErrorTasks.length}`);
      console.log(`Inaktive Klassen: ${r.inactiveClasses.length}`);
      console.log(`Tasks in Queue geschrieben: ${r.tasksQueued}`);
    })
    .catch(console.error);
}
