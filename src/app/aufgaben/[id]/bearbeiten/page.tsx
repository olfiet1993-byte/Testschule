import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { tasks, classes, contentItems, topics, curriculumUnits } from "@/db/schema";
import { eq, and, asc, inArray, or, isNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { QuizEditor } from "@/app/aufgaben/neu/QuizEditor";
import { FlashcardEditor } from "@/app/aufgaben/neu/FlashcardEditor";
import { ImageHotspotEditor } from "@/app/aufgaben/neu/ImageHotspotEditor";
import { ClozeEditor } from "@/app/aufgaben/neu/ClozeEditor";
import { CaseEditor } from "@/app/aufgaben/neu/CaseEditor";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) notFound();

  // Sicherstellen, dass die Aufgabe einer Klasse des aktuellen Lehrers gehört
  const owner = await db.query.classes.findFirst({
    where: and(eq(classes.id, task.classId), eq(classes.teacherId, session.user.id)),
  });
  if (!owner) notFound();

  const myClasses = await db.query.classes.findMany({
    where: eq(classes.teacherId, session.user.id),
  });
  const library = await db.query.contentItems.findMany({
    where: eq(contentItems.schoolId, session.user.schoolId),
  });
  const allTopics = myClasses.length
    ? await db.query.topics.findMany({
        where: inArray(topics.classId, myClasses.map((c) => c.id)),
        orderBy: [asc(topics.position)],
      })
    : [];

  const curriculum = await db.query.curriculumUnits.findMany({
    where: or(isNull(curriculumUnits.schoolId), eq(curriculumUnits.schoolId, session.user.schoolId)),
    orderBy: [asc(curriculumUnits.position)],
  });

  const taskJSON = JSON.parse(JSON.stringify(task));
  const classesJSON = JSON.parse(JSON.stringify(myClasses));
  const libraryJSON = JSON.parse(JSON.stringify(library));
  const topicsJSON = JSON.parse(JSON.stringify(allTopics));
  const curriculumJSON = JSON.parse(JSON.stringify(curriculum));

  const typeLabels: Record<string, string> = {
    quiz: "Quiz", flashcards: "Karteikarten", image_hotspot: "Bilderrätsel", cloze: "Lückentext", case_study: "Fallstudie",
  };

  return (
    <AppShell>
      <Link href="/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Aufgaben
      </Link>
      <h1 className="text-2xl font-bold mb-1">
        {typeLabels[task.type] ?? task.type} bearbeiten
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Änderungen werden sofort wirksam — wenn Schüler die Aufgabe bereits gelöst haben, bleiben deren Punkte erhalten.
      </p>

      {task.type === "quiz" && <QuizEditor classes={classesJSON} topics={topicsJSON} curriculum={curriculumJSON} task={taskJSON} />}
      {task.type === "flashcards" && <FlashcardEditor classes={classesJSON} library={libraryJSON} topics={topicsJSON} curriculum={curriculumJSON} task={taskJSON} />}
      {task.type === "image_hotspot" && <ImageHotspotEditor classes={classesJSON} library={libraryJSON} topics={topicsJSON} task={taskJSON} />}
      {task.type === "cloze" && <ClozeEditor classes={classesJSON} topics={topicsJSON} curriculum={curriculumJSON} task={taskJSON} />}
      {task.type === "case_study" && <CaseEditor classes={classesJSON} topics={topicsJSON} curriculum={curriculumJSON} task={taskJSON} />}
    </AppShell>
  );
}
