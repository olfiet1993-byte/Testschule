import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, topics, tasks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NeuerLernpfadForm } from "./NeuerLernpfadForm";

export default async function NeuerLernpfad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: [asc(topics.title)],
  });

  const classTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: [asc(tasks.createdAt)],
  });

  return (
    <AppShell>
      <Link href={`/klassen/${id}/lernpfade`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>
      <h1 className="text-2xl font-bold mb-4">Neuer Lernpfad — {klass.name}</h1>
      <NeuerLernpfadForm
        classId={id}
        topics={JSON.parse(JSON.stringify(classTopics))}
        taskCount={classTasks.length}
      />
    </AppShell>
  );
}
