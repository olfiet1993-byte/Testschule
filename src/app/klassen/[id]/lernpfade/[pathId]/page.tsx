import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, learningPaths, learningPathItems, tasks, topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LernpfadEditor } from "./LernpfadEditor";

export default async function LernpfadEdit({ params }: { params: Promise<{ id: string; pathId: string }> }) {
  const { id, pathId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const path = await db.query.learningPaths.findFirst({ where: eq(learningPaths.id, pathId) });
  if (!path || path.classId !== id) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const items = await db.query.learningPathItems.findMany({
    where: eq(learningPathItems.pathId, pathId),
    orderBy: [asc(learningPathItems.weekIndex), asc(learningPathItems.order)],
  });

  const classTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: [asc(tasks.title)],
  });

  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: [asc(topics.title)],
  });

  return (
    <AppShell>
      <Link href={`/klassen/${id}/lernpfade`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Liste
      </Link>
      <LernpfadEditor
        classId={id}
        path={JSON.parse(JSON.stringify(path))}
        items={JSON.parse(JSON.stringify(items))}
        tasks={JSON.parse(JSON.stringify(classTasks))}
        topics={JSON.parse(JSON.stringify(classTopics))}
      />
    </AppShell>
  );
}
