import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tasks, submissions, classMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { QuizSolver } from "./QuizSolver";
import { FlashcardSolver } from "./FlashcardSolver";
import { ImageHotspotSolver } from "./ImageHotspotSolver";
import { ClozeSolver } from "./ClozeSolver";
import { CaseSolver } from "./CaseSolver";

export default async function SolveTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task || !task.publishedAt) notFound();

  const access = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, task.classId), eq(classMembers.userId, session.user.id)),
  });
  if (!access) notFound();

  const prevSub = await db.query.submissions.findFirst({
    where: and(eq(submissions.taskId, id), eq(submissions.userId, session.user.id)),
  });

  const taskJSON = JSON.parse(JSON.stringify(task));
  const prevJSON = prevSub ? JSON.parse(JSON.stringify(prevSub)) : null;

  return (
    <AppShell>
      {task.type === "quiz" && <QuizSolver task={taskJSON} prevSubmission={prevJSON} />}
      {task.type === "flashcards" && <FlashcardSolver task={taskJSON} prevSubmission={prevJSON} />}
      {task.type === "image_hotspot" && <ImageHotspotSolver task={taskJSON} prevSubmission={prevJSON} />}
      {task.type === "cloze" && <ClozeSolver task={taskJSON} prevSubmission={prevJSON} />}
      {task.type === "case_study" && <CaseSolver task={taskJSON} prevSubmission={prevJSON} />}
      {!["quiz", "flashcards", "image_hotspot", "cloze", "case_study"].includes(task.type) && (
        <p className="text-slate-500">Aufgabentyp {task.type} noch nicht implementiert.</p>
      )}
    </AppShell>
  );
}
