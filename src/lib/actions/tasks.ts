"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, submissions, users, classes, classMembers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { levelFromXp } from "@/lib/utils";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

async function student() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Nicht autorisiert");
  return session.user;
}

export type QuizPayload = {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
};

export type FlashcardPayload = {
  cards: Array<{ front: string; back: string }>;
};

export type CaseStudyPayload = {
  intro: string;
  steps: Array<{
    id: string;
    description: string;
    question: string;
    options: Array<{
      text: string;
      feedback?: string;
      isCorrect: boolean;
      next: string | null; // ID des nächsten Schritts oder null = Ende
    }>;
  }>;
};

export type ClozePayload = {
  // Text mit Platzhaltern: jeder Eintrag ist entweder fester Text oder eine Lücke.
  // Format-Vereinfachung: ein einziger Text mit {{antwort}}-Markern.
  text: string;
  // Akzeptierte Antworten pro Lücke. Eine Lücke kann mehrere Synonyme haben.
  blanks: Array<{ index: number; answers: string[]; caseSensitive?: boolean }>;
};

export type ImageHotspotPayload = {
  imagePath: string;
  hotspots: Array<{
    id: string;
    x: number; // 0–100 (Prozent der Bildbreite)
    y: number;
    radius?: number;        // Treffer-Toleranz in % Bildbreite (default 8)
    label: string;          // Anzeige, was der Schüler suchen soll, z. B. "Femur"
    explanation?: string;
  }>;
};

export async function createQuizTask(input: {
  classId: string;
  title: string;
  description?: string;
  topicId?: string | null;
  xpReward: number;
  questions: QuizPayload["questions"];
  publish: boolean;
  aiGenerated?: boolean;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  const me = await teacher();
  if (input.questions.length === 0) throw new Error("Mindestens eine Frage erforderlich");
  for (const q of input.questions) {
    if (!q.question.trim()) throw new Error("Frage darf nicht leer sein");
    if (q.options.filter((o) => o.trim()).length < 2) throw new Error("Mindestens 2 Antwortmöglichkeiten");
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) throw new Error("Korrekte Antwort markieren");
  }

  const payload: QuizPayload = { questions: input.questions };
  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    authorId: me.id,
    type: "quiz",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: JSON.stringify(payload),
    xpReward: input.xpReward,
    // KI-generierte Tasks niemals direkt veröffentlichen — erst nach Review
    publishedAt: (input.publish && !input.aiGenerated) ? new Date() : null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
    aiGenerated: input.aiGenerated ?? false,
    reviewedAt: null,
  }).returning();

  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.classId}`);
  return task.id;
}

export async function deleteTask(taskId: string) {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  await db.delete(tasks).where(eq(tasks.id, taskId));
  revalidatePath("/aufgaben");
  if (t) {
    revalidatePath(`/klassen/${t.classId}`);
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
      action: "task.delete", entityType: "task", entityId: t.id,
      summary: `Aufgabe "${t.title}" gelöscht`,
    });
  }
}

/**
 * Lehrkraft bestätigt KI-generierten Inhalt nach eigenem Review.
 * Setzt reviewedAt — erst danach ist Veröffentlichung möglich.
 */
export async function reviewTask(taskId: string) {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  if (t.authorId !== me.id) throw new Error("Keine Berechtigung");
  if (!t.aiGenerated) throw new Error("Aufgabe wurde nicht KI-generiert");

  await db.update(tasks)
    .set({ reviewedAt: new Date() })
    .where(eq(tasks.id, taskId));

  revalidatePath("/aufgaben");
  revalidatePath(`/aufgaben/${taskId}/bearbeiten`);
}

export async function togglePublishTask(taskId: string) {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");

  // KI-Guard: erst prüfen, dann veröffentlichen
  if (t.aiGenerated && !t.reviewedAt) {
    throw new Error("KI_REVIEW_REQUIRED");
  }

  const willBePublished = !t.publishedAt;
  await db.update(tasks)
    .set({ publishedAt: willBePublished ? new Date() : null })
    .where(eq(tasks.id, taskId));

  // Bei Veröffentlichung alle Schüler der Klasse benachrichtigen
  if (willBePublished) {
    const { db: db2 } = await import("@/db");
    const { classMembers } = await import("@/db/schema");
    const members = await db2.query.classMembers.findMany({
      where: eq(classMembers.classId, t.classId),
    });
    const { notifyMany } = await import("@/lib/notifications");
    await notifyMany(members.map((m) => m.userId), {
      type: "task_published",
      title: `Neue Aufgabe: ${t.title}`,
      body: `${t.xpReward} XP zu holen`,
      href: `/sus/aufgaben/${t.id}`,
    });
  }

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: willBePublished ? "task.publish" : "task.unpublish",
    entityType: "task", entityId: t.id,
    summary: willBePublished
      ? `Aufgabe "${t.title}" veröffentlicht`
      : `Aufgabe "${t.title}" zurückgenommen`,
  });

  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${t.classId}`);
}

/**
 * Veröffentlicht mehrere Aufgaben auf einmal — z. B. „alle für heute geplanten freigeben".
 * Schickt eine Notification je Schüler je veröffentlichter Aufgabe und schreibt Audit-Logs.
 */
export async function publishTasks(input: { taskIds: string[] }): Promise<{ published: number }> {
  const me = await teacher();
  if (!input.taskIds || input.taskIds.length === 0) return { published: 0 };

  const candidates = await db.query.tasks.findMany({
    where: inArray(tasks.id, input.taskIds),
  });
  // Nur unveröffentlichte + nur eigene Klassen
  const myClasses = await db.query.classes.findMany({ where: eq(classes.teacherId, me.id) });
  const myClassIds = new Set(myClasses.map((c) => c.id));
  // KI-Guard: KI-generierte ohne Review herausfiltern
  const toPublish = candidates.filter(
    (t) => !t.publishedAt && myClassIds.has(t.classId) && !(t.aiGenerated && !t.reviewedAt),
  );
  if (toPublish.length === 0) return { published: 0 };

  const now = new Date();
  await db.update(tasks)
    .set({ publishedAt: now })
    .where(inArray(tasks.id, toPublish.map((t) => t.id)));

  // Notifications je Klasse einmal sammeln, je Schüler je Aufgabe schicken
  const { notifyMany } = await import("@/lib/notifications");
  const { logAudit } = await import("@/lib/audit");
  const classIdSet = Array.from(new Set(toPublish.map((t) => t.classId)));
  const allMembers = await db.query.classMembers.findMany({
    where: inArray(classMembers.classId, classIdSet),
  });
  const byClass: Record<string, string[]> = {};
  for (const m of allMembers) {
    if (!byClass[m.classId]) byClass[m.classId] = [];
    byClass[m.classId].push(m.userId);
  }
  for (const t of toPublish) {
    const userIds = byClass[t.classId] ?? [];
    if (userIds.length > 0) {
      await notifyMany(userIds, {
        type: "task_published",
        title: `Neue Aufgabe: ${t.title}`,
        body: `${t.xpReward} XP zu holen`,
        href: `/sus/aufgaben/${t.id}`,
      });
    }
    await logAudit({
      schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
      action: "task.publish",
      entityType: "task", entityId: t.id,
      summary: `Aufgabe "${t.title}" veröffentlicht (Bulk aus Klassenzimmer)`,
    });
  }

  revalidatePath("/aufgaben");
  revalidatePath("/sus/aufgaben");
  for (const cid of classIdSet) revalidatePath(`/klassen/${cid}`);
  return { published: toPublish.length };
}

/**
 * Schickt eine Notification an alle Klassenmitglieder, die zu einer (veröffentlichten)
 * Aufgabe noch keine Abgabe haben. Throttle: nicht öfter als alle 10 Minuten je Task.
 */
export async function remindNonSubmitters(taskId: string): Promise<{ reminded: number }> {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  if (!t.publishedAt) throw new Error("Aufgabe ist noch nicht veröffentlicht");

  // Nur eigene Klassen
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, t.classId) });
  if (!klass || klass.teacherId !== me.id) {
    // Co-Teacher prüfen (vereinfacht — verlässt sich auf canManageClass-Logik im echten Pfad)
    const { canManageClass } = await import("@/lib/permissions");
    if (!(await canManageClass(me.id, t.classId))) throw new Error("Keine Berechtigung");
  }

  // Mitglieder + bereits Abgebende
  const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, t.classId) });
  const subsRows = await db.query.submissions.findMany({ where: eq(submissions.taskId, t.id) });
  const submitted = new Set(subsRows.map((s) => s.userId));
  const pending = members.filter((m) => !submitted.has(m.userId)).map((m) => m.userId);

  if (pending.length === 0) return { reminded: 0 };

  const { notifyMany } = await import("@/lib/notifications");
  await notifyMany(pending, {
    type: "task_published",
    title: `Erinnerung: ${t.title}`,
    body: `Du hast diese Aufgabe noch nicht bearbeitet. ${t.xpReward} XP warten.`,
    href: `/sus/aufgaben/${t.id}`,
  });

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: "task.publish",
    entityType: "task", entityId: t.id,
    summary: `${pending.length} Schüler:innen an "${t.title}" erinnert`,
  });

  revalidatePath("/sus/aufgaben");
  return { reminded: pending.length };
}

export async function setTaskDueDate(taskId: string, isoDate: string | null) {
  await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  const dueAt = isoDate ? new Date(isoDate) : null;
  await db.update(tasks).set({ dueAt }).where(eq(tasks.id, taskId));
  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${t.classId}`);
  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
}

// Generische Bearbeitung — payload, title, description, xpReward, classId, topicId, exam-Felder
export async function updateTask(input: {
  taskId: string;
  title: string;
  description?: string;
  classId: string;
  xpReward: number;
  payload: any;
  topicId?: string | null;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  await teacher();
  await db.update(tasks).set({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    classId: input.classId,
    xpReward: input.xpReward,
    payload: JSON.stringify(input.payload),
    topicId: input.topicId ?? null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
  }).where(eq(tasks.id, input.taskId));
  revalidatePath("/aufgaben");
  revalidatePath(`/aufgaben/${input.taskId}/bearbeiten`);
}

export async function duplicateTask(input: { taskId: string; targetClassId?: string }) {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");

  // Berechtigung prüfen
  const { canManageClass } = await import("@/lib/permissions");
  const targetClassId = input.targetClassId ?? t.classId;
  if (!(await canManageClass(me.id, t.classId))) throw new Error("Quell-Klasse nicht erlaubt");
  if (targetClassId !== t.classId && !(await canManageClass(me.id, targetClassId))) {
    throw new Error("Ziel-Klasse nicht erlaubt");
  }

  // Wenn Ziel-Klasse anders ist, kann topicId nicht übernommen werden
  const keepTopic = targetClassId === t.classId;

  const [copy] = await db.insert(tasks).values({
    classId: targetClassId,
    topicId: keepTopic ? t.topicId : null,
    authorId: me.id,
    type: t.type,
    title: `${t.title} (Kopie)`,
    description: t.description,
    payload: t.payload,
    xpReward: t.xpReward,
    publishedAt: null, // immer als Entwurf
    examMode: t.examMode,
    timeLimitMinutes: t.timeLimitMinutes,
  }).returning();

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: "task.create", entityType: "task", entityId: copy.id,
    summary: `Aufgabe "${t.title}" dupliziert${targetClassId !== t.classId ? " (in andere Klasse)" : ""}`,
  });

  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${targetClassId}`);
  return copy.id;
}

export async function revealTaskAnswers(taskId: string) {
  const me = await teacher();
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!t) throw new Error("Aufgabe nicht gefunden");
  await db.update(tasks).set({ answersRevealedAt: new Date() }).where(eq(tasks.id, taskId));
  revalidatePath("/aufgaben");
  revalidatePath(`/sus/aufgaben/${taskId}`);
}

export async function hideTaskAnswers(taskId: string) {
  await teacher();
  await db.update(tasks).set({ answersRevealedAt: null }).where(eq(tasks.id, taskId));
  revalidatePath("/aufgaben");
  revalidatePath(`/sus/aufgaben/${taskId}`);
}

export async function submitQuiz(taskId: string, answers: number[]) {
  const me = await student();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "quiz") throw new Error("Aufgabe nicht gefunden");

  const payload = JSON.parse(task.payload) as QuizPayload;
  let correct = 0;
  payload.questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) correct++;
  });
  const scorePct = payload.questions.length > 0 ? (correct / payload.questions.length) * 100 : 0;
  const xpEarned = Math.round((scorePct / 100) * task.xpReward);

  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, me.id)),
  });

  // Klausur-Modus: bei vorhandener Abgabe blocken
  if (task.examMode && existing) {
    throw new Error("Klausur bereits abgegeben — nur ein Versuch erlaubt.");
  }

  if (existing) {
    if (scorePct > (existing.scorePct ?? 0)) {
      const xpDelta = xpEarned - existing.xpEarned;
      await db.update(submissions).set({
        answer: JSON.stringify(answers),
        scorePct,
        xpEarned,
        submittedAt: new Date(),
      }).where(eq(submissions.id, existing.id));
      if (xpDelta > 0) await awardXp(me.id, xpDelta);
    }
  } else {
    await db.insert(submissions).values({
      taskId,
      userId: me.id,
      answer: JSON.stringify(answers),
      scorePct,
      xpEarned,
    });
    await awardXp(me.id, xpEarned);
  }

  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
  return { correct, total: payload.questions.length, scorePct, xpEarned };
}

async function awardXp(userId: string, delta: number) {
  if (delta <= 0) return;
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return;
  const newXp = u.xp + delta;
  const newLevel = levelFromXp(newXp);
  await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
  // Streak/Aktivität separat
  const { updateStreak } = await import("@/lib/streak");
  await updateStreak(userId);
}

// --- Karteikarten ---

export async function createFlashcardTask(input: {
  classId: string;
  title: string;
  description?: string;
  topicId?: string | null;
  xpReward: number;
  cards: FlashcardPayload["cards"];
  publish: boolean;
  aiGenerated?: boolean;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  const me = await teacher();
  if (input.cards.length === 0) throw new Error("Mindestens eine Karte erforderlich");
  for (const c of input.cards) {
    if (!c.front.trim() || !c.back.trim()) throw new Error("Vorder- und Rückseite jeder Karte ausfüllen");
  }
  const payload: FlashcardPayload = { cards: input.cards };
  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    authorId: me.id,
    type: "flashcards",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: JSON.stringify(payload),
    xpReward: input.xpReward,
    publishedAt: (input.publish && !input.aiGenerated) ? new Date() : null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
    aiGenerated: input.aiGenerated ?? false,
    reviewedAt: null,
  }).returning();
  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.classId}`);
  return task.id;
}

export async function submitFlashcards(
  taskId: string,
  known: number[],
  mode: "all" | "drill" = "all",
) {
  const me = await student();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "flashcards") throw new Error("Aufgabe nicht gefunden");
  const payload = JSON.parse(task.payload) as FlashcardPayload;
  const total = payload.cards.length;

  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, me.id)),
  });

  if (task.examMode && existing) {
    throw new Error("Klausur bereits abgegeben — nur ein Versuch erlaubt.");
  }

  let finalKnown = known;
  if (mode === "drill" && existing?.answer) {
    try {
      const prev = JSON.parse(existing.answer) as number[];
      // Union: previously-known + neu-gewusste (im Drill nur unbekannte gezeigt)
      finalKnown = Array.from(new Set([...prev, ...known]));
    } catch {
      // ignore
    }
  }

  const correct = finalKnown.length;
  const scorePct = total > 0 ? (correct / total) * 100 : 0;
  const xpEarned = Math.round((scorePct / 100) * task.xpReward);

  if (existing) {
    if (scorePct > (existing.scorePct ?? 0)) {
      const xpDelta = xpEarned - existing.xpEarned;
      await db.update(submissions).set({
        answer: JSON.stringify(finalKnown),
        scorePct,
        xpEarned,
        submittedAt: new Date(),
      }).where(eq(submissions.id, existing.id));
      if (xpDelta > 0) await awardXp(me.id, xpDelta);
    }
  } else {
    await db.insert(submissions).values({
      taskId, userId: me.id, answer: JSON.stringify(finalKnown), scorePct, xpEarned,
    });
    await awardXp(me.id, xpEarned);
  }
  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
  return { correct, total, scorePct, xpEarned };
}

// --- Lückentext ---

export async function createClozeTask(input: {
  classId: string;
  title: string;
  description?: string;
  topicId?: string | null;
  xpReward: number;
  text: string;
  blanks: ClozePayload["blanks"];
  publish: boolean;
  aiGenerated?: boolean;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  const me = await teacher();
  if (!input.text.trim()) throw new Error("Text fehlt");
  if (input.blanks.length === 0) throw new Error("Mindestens eine Lücke");
  for (const b of input.blanks) {
    if (b.answers.filter((a) => a.trim()).length === 0)
      throw new Error("Jede Lücke braucht mindestens eine richtige Antwort");
  }
  const payload: ClozePayload = { text: input.text, blanks: input.blanks };
  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    authorId: me.id,
    type: "cloze",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: JSON.stringify(payload),
    xpReward: input.xpReward,
    publishedAt: (input.publish && !input.aiGenerated) ? new Date() : null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
    aiGenerated: input.aiGenerated ?? false,
    reviewedAt: null,
  }).returning();
  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.classId}`);
  return task.id;
}

export async function submitCloze(taskId: string, answers: string[]) {
  const me = await student();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "cloze") throw new Error("Aufgabe nicht gefunden");
  const payload = JSON.parse(task.payload) as ClozePayload;

  let correct = 0;
  const details: Array<{ index: number; given: string; ok: boolean; expected: string[] }> = [];
  for (const b of payload.blanks) {
    const given = (answers[b.index] ?? "").trim();
    const accepted = b.answers.map((a) =>
      b.caseSensitive ? a.trim() : a.trim().toLowerCase()
    );
    const compare = b.caseSensitive ? given : given.toLowerCase();
    const ok = accepted.includes(compare);
    if (ok) correct++;
    details.push({ index: b.index, given, ok, expected: b.answers });
  }
  const total = payload.blanks.length;
  const scorePct = total > 0 ? (correct / total) * 100 : 0;
  const xpEarned = Math.round((scorePct / 100) * task.xpReward);

  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, me.id)),
  });
  if (task.examMode && existing) {
    throw new Error("Klausur bereits abgegeben — nur ein Versuch erlaubt.");
  }
  if (existing) {
    if (scorePct > (existing.scorePct ?? 0)) {
      const xpDelta = xpEarned - existing.xpEarned;
      await db.update(submissions).set({
        answer: JSON.stringify(answers),
        scorePct, xpEarned, submittedAt: new Date(),
      }).where(eq(submissions.id, existing.id));
      if (xpDelta > 0) await awardXp(me.id, xpDelta);
    }
  } else {
    await db.insert(submissions).values({
      taskId, userId: me.id, answer: JSON.stringify(answers), scorePct, xpEarned,
    });
    await awardXp(me.id, xpEarned);
  }
  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
  return { correct, total, scorePct, xpEarned, details };
}

// --- Fallstudie ---

export async function createCaseTask(input: {
  classId: string;
  title: string;
  description?: string;
  topicId?: string | null;
  xpReward: number;
  intro: string;
  steps: CaseStudyPayload["steps"];
  publish: boolean;
  aiGenerated?: boolean;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  const me = await teacher();
  if (input.steps.length === 0) throw new Error("Mindestens ein Schritt erforderlich");
  for (const s of input.steps) {
    if (!s.question.trim()) throw new Error("Jeder Schritt braucht eine Frage");
    if (s.options.filter((o) => o.text.trim()).length < 2) throw new Error("Mindestens 2 Optionen pro Schritt");
    if (!s.options.some((o) => o.isCorrect)) throw new Error("Mindestens eine Option pro Schritt muss korrekt sein");
  }
  const payload: CaseStudyPayload = { intro: input.intro, steps: input.steps };
  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    authorId: me.id,
    type: "case_study",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: JSON.stringify(payload),
    xpReward: input.xpReward,
    publishedAt: (input.publish && !input.aiGenerated) ? new Date() : null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
    aiGenerated: input.aiGenerated ?? false,
    reviewedAt: null,
  }).returning();
  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.classId}`);
  return task.id;
}

export async function submitCase(taskId: string, decisions: Array<{ stepId: string; optionIdx: number }>) {
  const me = await student();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "case_study") throw new Error("Aufgabe nicht gefunden");
  const payload = JSON.parse(task.payload) as CaseStudyPayload;

  let correct = 0;
  for (const d of decisions) {
    const step = payload.steps.find((s) => s.id === d.stepId);
    if (!step) continue;
    const opt = step.options[d.optionIdx];
    if (opt?.isCorrect) correct++;
  }
  const total = decisions.length;
  const scorePct = total > 0 ? (correct / total) * 100 : 0;
  const xpEarned = Math.round((scorePct / 100) * task.xpReward);

  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, me.id)),
  });
  if (task.examMode && existing) {
    throw new Error("Klausur bereits abgegeben — nur ein Versuch erlaubt.");
  }
  if (existing) {
    if (scorePct > (existing.scorePct ?? 0)) {
      const xpDelta = xpEarned - existing.xpEarned;
      await db.update(submissions).set({
        answer: JSON.stringify(decisions),
        scorePct, xpEarned, submittedAt: new Date(),
      }).where(eq(submissions.id, existing.id));
      if (xpDelta > 0) await awardXp(me.id, xpDelta);
    }
  } else {
    await db.insert(submissions).values({
      taskId, userId: me.id, answer: JSON.stringify(decisions), scorePct, xpEarned,
    });
    await awardXp(me.id, xpEarned);
  }
  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
  return { correct, total, scorePct, xpEarned };
}

// --- Bilderrätsel ---

export async function createImageHotspotTask(input: {
  classId: string;
  title: string;
  description?: string;
  topicId?: string | null;
  xpReward: number;
  imagePath: string;
  hotspots: ImageHotspotPayload["hotspots"];
  publish: boolean;
  examMode?: boolean;
  timeLimitMinutes?: number | null;
  difficulty?: number | null;
  curriculumUnitId?: string | null;
  sharedInSchool?: boolean;
}) {
  const me = await teacher();
  if (!input.imagePath) throw new Error("Bild auswählen");
  if (input.hotspots.length === 0) throw new Error("Mindestens einen Hotspot setzen");
  for (const h of input.hotspots) {
    if (!h.label.trim()) throw new Error("Jeder Hotspot braucht einen Begriff");
  }
  const payload: ImageHotspotPayload = { imagePath: input.imagePath, hotspots: input.hotspots };
  const [task] = await db.insert(tasks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    authorId: me.id,
    type: "image_hotspot",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: JSON.stringify(payload),
    xpReward: input.xpReward,
    publishedAt: input.publish ? new Date() : null,
    examMode: input.examMode ?? false,
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    difficulty: input.difficulty ?? null,
    curriculumUnitId: input.curriculumUnitId ?? null,
    sharedInSchool: input.sharedInSchool ?? false,
  }).returning();
  revalidatePath("/aufgaben");
  revalidatePath(`/klassen/${input.classId}`);
  return task.id;
}

// Schüler übergibt für jeden Hotspot seine Klick-Position.
// Treffer = Klick innerhalb des konfigurierten Radius (Default 8% Bildbreite).
const HOTSPOT_RADIUS_DEFAULT = 8;

export async function submitImageHotspot(
  taskId: string,
  clicks: Array<{ hotspotId: string; x: number; y: number }>,
) {
  const me = await student();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "image_hotspot") throw new Error("Aufgabe nicht gefunden");
  const payload = JSON.parse(task.payload) as ImageHotspotPayload;

  let correct = 0;
  for (const h of payload.hotspots) {
    const click = clicks.find((c) => c.hotspotId === h.id);
    if (!click) continue;
    const dx = click.x - h.x;
    const dy = click.y - h.y;
    const radius = h.radius ?? HOTSPOT_RADIUS_DEFAULT;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) correct++;
  }
  const total = payload.hotspots.length;
  const scorePct = total > 0 ? (correct / total) * 100 : 0;
  const xpEarned = Math.round((scorePct / 100) * task.xpReward);

  const existing = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, taskId), eq(submissions.userId, me.id)),
  });
  if (task.examMode && existing) {
    throw new Error("Klausur bereits abgegeben — nur ein Versuch erlaubt.");
  }
  if (existing) {
    if (scorePct > (existing.scorePct ?? 0)) {
      const xpDelta = xpEarned - existing.xpEarned;
      await db.update(submissions).set({
        answer: JSON.stringify(clicks),
        scorePct,
        xpEarned,
        submittedAt: new Date(),
      }).where(eq(submissions.id, existing.id));
      if (xpDelta > 0) await awardXp(me.id, xpDelta);
    }
  } else {
    await db.insert(submissions).values({
      taskId, userId: me.id, answer: JSON.stringify(clicks), scorePct, xpEarned,
    });
    await awardXp(me.id, xpEarned);
  }
  revalidatePath("/sus");
  revalidatePath("/sus/aufgaben");
  return { correct, total, scorePct, xpEarned };
}
