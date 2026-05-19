"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, classes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createSession, type QuizQuestion } from "@/lib/live/sessions";
import { redirect } from "next/navigation";

export async function startLiveSession(taskId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.type !== "quiz") throw new Error("Nur Quiz-Aufgaben live spielbar");

  const klass = await db.query.classes.findFirst({
    where: and(eq(classes.id, task.classId), eq(classes.teacherId, session.user.id)),
  });
  if (!klass) throw new Error("Klasse nicht gefunden");

  const payload = JSON.parse(task.payload) as { questions: QuizQuestion[] };

  const live = createSession({
    classId: klass.id,
    className: klass.name,
    hostId: session.user.id,
    hostName: session.user.displayName,
    taskId: task.id,
    taskTitle: task.title,
    questions: payload.questions,
  });

  redirect(`/aufgaben/${taskId}/live/${live.id}`);
}
