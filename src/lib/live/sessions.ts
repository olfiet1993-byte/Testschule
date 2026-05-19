/**
 * In-Memory Live-Quiz Session-Manager.
 *
 * Speichert aktive Sessions im Speicher des Next.js-Prozesses.
 * Stirbt der Prozess, sind die Sessions weg — für eine 10-Minuten-Quiz-Runde
 * absolut ausreichend, und die echten Daten (XP, Submissions) werden am Ende
 * eh in die SQLite-DB geschrieben.
 */

import { EventEmitter } from "node:events";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { tasks, submissions, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { levelFromXp } from "@/lib/utils";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type SessionState = "lobby" | "question" | "reveal" | "leaderboard" | "ended";

export type Participant = {
  userId: string;
  displayName: string;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  joinedAt: number;
  score: number;
  answers: Map<number, { optionIdx: number; timeMs: number; correct: boolean; points: number }>;
  xpEarned?: number; // gefüllt nach finalizeResults
};

export type LiveSession = {
  id: string;
  code: string;
  classId: string;
  className: string;
  hostId: string;
  hostName: string;
  taskId: string;
  taskTitle: string;
  questions: QuizQuestion[];
  questionDurationMs: number;
  state: SessionState;
  currentQuestionIdx: number;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  participants: Map<string, Participant>;
  events: EventEmitter;
  createdAt: number;
};

const sessions = new Map<string, LiveSession>();
const sessionsByCode = new Map<string, LiveSession>();
const sessionsByClass = new Map<string, LiveSession>();

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 h
const QUESTION_DURATION_DEFAULT_MS = 25_000;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createSession(opts: {
  classId: string;
  className: string;
  hostId: string;
  hostName: string;
  taskId: string;
  taskTitle: string;
  questions: QuizQuestion[];
  questionDurationMs?: number;
}): LiveSession {
  // Falls Klasse bereits eine Session hat: zuerst beenden
  const existing = sessionsByClass.get(opts.classId);
  if (existing) endSession(existing.id);

  let code = generateCode();
  while (sessionsByCode.has(code)) code = generateCode();

  const session: LiveSession = {
    id: nanoid(10),
    code,
    classId: opts.classId,
    className: opts.className,
    hostId: opts.hostId,
    hostName: opts.hostName,
    taskId: opts.taskId,
    taskTitle: opts.taskTitle,
    questions: opts.questions,
    questionDurationMs: opts.questionDurationMs ?? QUESTION_DURATION_DEFAULT_MS,
    state: "lobby",
    currentQuestionIdx: 0,
    questionStartedAt: null,
    questionEndsAt: null,
    participants: new Map(),
    events: new EventEmitter(),
    createdAt: Date.now(),
  };
  session.events.setMaxListeners(100);

  sessions.set(session.id, session);
  sessionsByCode.set(code, session);
  sessionsByClass.set(opts.classId, session);

  // GC nach 1 h
  setTimeout(() => endSession(session.id), SESSION_TTL_MS);

  return session;
}

export function getSession(id: string): LiveSession | undefined {
  return sessions.get(id);
}

export function getSessionByCode(code: string): LiveSession | undefined {
  return sessionsByCode.get(code.toUpperCase().trim());
}

export function getActiveSessionForClass(classId: string): LiveSession | undefined {
  const s = sessionsByClass.get(classId);
  if (s && s.state !== "ended") return s;
  return undefined;
}

export function endSession(id: string) {
  const s = sessions.get(id);
  if (!s) return;
  s.state = "ended";
  s.events.emit("update", buildPublicState(s));
  s.events.removeAllListeners();
  sessions.delete(id);
  sessionsByCode.delete(s.code);
  if (sessionsByClass.get(s.classId)?.id === id) {
    sessionsByClass.delete(s.classId);
  }
}

export function joinSession(
  sessionId: string,
  userId: string,
  displayName: string,
  avatarEmoji?: string | null,
  avatarColor?: string | null,
): LiveSession | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (s.state === "ended") return null;
  if (!s.participants.has(userId)) {
    s.participants.set(userId, {
      userId,
      displayName,
      avatarEmoji,
      avatarColor,
      joinedAt: Date.now(),
      score: 0,
      answers: new Map(),
    });
    s.events.emit("update", buildPublicState(s));
  }
  return s;
}

export function startQuestion(sessionId: string, hostId: string): boolean {
  const s = sessions.get(sessionId);
  if (!s || s.hostId !== hostId) return false;
  if (s.state !== "lobby" && s.state !== "leaderboard") return false;

  s.state = "question";
  s.questionStartedAt = Date.now();
  s.questionEndsAt = s.questionStartedAt + s.questionDurationMs;
  s.events.emit("update", buildPublicState(s));

  // Auto-Reveal nach Ablauf
  setTimeout(() => {
    if (s.state === "question" && s.currentQuestionIdx === s.questionStartedAt) {
      // (idx unchanged → noch in derselben Frage)
    }
    if (s.state === "question") {
      s.state = "reveal";
      s.events.emit("update", buildPublicState(s));
      setTimeout(() => {
        if (s.state === "reveal") {
          s.state = "leaderboard";
          s.events.emit("update", buildPublicState(s));
        }
      }, 6000);
    }
  }, s.questionDurationMs);

  return true;
}

export function submitAnswer(
  sessionId: string,
  userId: string,
  optionIdx: number,
): { ok: boolean; correct?: boolean; points?: number } {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false };
  if (s.state !== "question") return { ok: false };
  const p = s.participants.get(userId);
  if (!p) return { ok: false };
  if (p.answers.has(s.currentQuestionIdx)) return { ok: false };

  const q = s.questions[s.currentQuestionIdx];
  if (!q) return { ok: false };

  const correct = optionIdx === q.correctIndex;
  const elapsed = Math.max(0, Date.now() - (s.questionStartedAt ?? Date.now()));
  const ratio = Math.min(1, elapsed / s.questionDurationMs);
  // Punkte: 1000 max, 500 min (bei voller Zeit). Falsch = 0.
  const points = correct ? Math.round(1000 - 500 * ratio) : 0;

  p.answers.set(s.currentQuestionIdx, { optionIdx, timeMs: elapsed, correct, points });
  p.score += points;
  s.events.emit("update", buildPublicState(s));

  // Wenn alle geantwortet haben → vorzeitig auflösen
  const allAnswered = Array.from(s.participants.values()).every((pp) =>
    pp.answers.has(s.currentQuestionIdx),
  );
  if (allAnswered && s.participants.size > 0) {
    s.state = "reveal";
    s.events.emit("update", buildPublicState(s));
    setTimeout(() => {
      if (s.state === "reveal") {
        s.state = "leaderboard";
        s.events.emit("update", buildPublicState(s));
      }
    }, 4000);
  }

  return { ok: true, correct, points };
}

export function nextQuestion(sessionId: string, hostId: string): boolean {
  const s = sessions.get(sessionId);
  if (!s || s.hostId !== hostId) return false;
  if (s.state !== "leaderboard" && s.state !== "reveal") return false;
  if (s.currentQuestionIdx >= s.questions.length - 1) {
    void finalizeAndEnd(s);
    return true;
  }
  s.currentQuestionIdx++;
  s.state = "lobby"; // dann start_question
  s.questionStartedAt = null;
  s.questionEndsAt = null;
  s.events.emit("update", buildPublicState(s));
  return true;
}

export function endNow(sessionId: string, hostId: string): boolean {
  const s = sessions.get(sessionId);
  if (!s || s.hostId !== hostId) return false;
  void finalizeAndEnd(s);
  return true;
}

async function finalizeAndEnd(s: LiveSession) {
  try {
    await persistResults(s);
  } catch (err) {
    console.error("Live-Quiz Persistierung fehlgeschlagen:", err);
  }
  s.state = "ended";
  s.events.emit("update", buildPublicState(s));
}

async function persistResults(s: LiveSession) {
  if (s.participants.size === 0) return;
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, s.taskId) });
  if (!task) return;

  const maxPossiblePoints = 1000 * s.questions.length;
  if (maxPossiblePoints === 0) return;

  for (const p of s.participants.values()) {
    const scorePct = (p.score / maxPossiblePoints) * 100;
    const xpEarned = Math.round((scorePct / 100) * task.xpReward);

    const answerSummary = {
      mode: "live",
      sessionId: s.id,
      finalScore: p.score,
      perQuestion: Array.from(p.answers.entries()).map(([idx, a]) => ({
        idx,
        optionIdx: a.optionIdx,
        correct: a.correct,
        timeMs: a.timeMs,
        points: a.points,
      })),
    };

    const existing = await db.query.submissions.findFirst({
      where: and(eq(submissions.taskId, s.taskId), eq(submissions.userId, p.userId)),
    });

    if (existing) {
      if (scorePct > (existing.scorePct ?? 0)) {
        const delta = xpEarned - existing.xpEarned;
        await db.update(submissions).set({
          answer: JSON.stringify(answerSummary),
          scorePct,
          xpEarned,
          submittedAt: new Date(),
        }).where(eq(submissions.id, existing.id));
        if (delta > 0) await awardXp(p.userId, delta);
        p.xpEarned = delta > 0 ? delta : 0;
      } else {
        p.xpEarned = 0; // schon bessere Abgabe vorhanden
      }
    } else {
      await db.insert(submissions).values({
        taskId: s.taskId,
        userId: p.userId,
        answer: JSON.stringify(answerSummary),
        scorePct,
        xpEarned,
      });
      await awardXp(p.userId, xpEarned);
      p.xpEarned = xpEarned;
    }
  }
}

async function awardXp(userId: string, delta: number) {
  if (delta <= 0) return;
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return;
  const newXp = u.xp + delta;
  const newLevel = levelFromXp(newXp);
  await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
  const { updateStreak } = await import("@/lib/streak");
  await updateStreak(userId);
}

/**
 * Build broadcast-safe public state — never sends correctIndex while a question
 * is active, only at reveal/leaderboard.
 */
export function buildPublicState(s: LiveSession) {
  const q = s.questions[s.currentQuestionIdx];
  const ranking = Array.from(s.participants.values())
    .map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarEmoji: p.avatarEmoji ?? null,
      avatarColor: p.avatarColor ?? null,
      score: p.score,
      xpEarned: p.xpEarned,
    }))
    .sort((a, b) => b.score - a.score);

  const baseQuestion = q
    ? {
        index: s.currentQuestionIdx,
        total: s.questions.length,
        question: s.state === "lobby" ? null : q.question,
        options: s.state === "lobby" ? [] : q.options,
        correctIndex: s.state === "reveal" || s.state === "leaderboard" || s.state === "ended" ? q.correctIndex : null,
        explanation: s.state === "reveal" || s.state === "leaderboard" ? q.explanation ?? null : null,
        startedAt: s.questionStartedAt,
        endsAt: s.questionEndsAt,
        answersCount: Array.from(s.participants.values()).filter((p) => p.answers.has(s.currentQuestionIdx)).length,
      }
    : null;

  return {
    id: s.id,
    code: s.code,
    classId: s.classId,
    className: s.className,
    taskTitle: s.taskTitle,
    hostName: s.hostName,
    state: s.state,
    currentQuestion: baseQuestion,
    participants: ranking,
    questionDurationMs: s.questionDurationMs,
  };
}
