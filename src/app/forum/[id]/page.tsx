import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { questions, answers, users, classes, classMembers } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle } from "lucide-react";
import { QuestionDetailClient } from "./QuestionDetailClient";

export default async function QuestionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const q = await db.query.questions.findFirst({ where: eq(questions.id, id) });
  if (!q) notFound();

  // Zugriff prüfen
  if (session.user.role === "teacher") {
    const c = await db.query.classes.findFirst({
      where: and(eq(classes.id, q.classId), eq(classes.teacherId, session.user.id)),
    });
    if (!c) notFound();
  } else {
    const m = await db.query.classMembers.findFirst({
      where: and(eq(classMembers.classId, q.classId), eq(classMembers.userId, session.user.id)),
    });
    if (!m) notFound();
  }

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, q.classId) });
  const author = await db.query.users.findFirst({ where: eq(users.id, q.authorId) });

  const answerList = await db
    .select({
      id: answers.id,
      body: answers.body,
      isAccepted: answers.isAccepted,
      createdAt: answers.createdAt,
      authorId: users.id,
      authorName: users.displayName,
      authorRole: users.role,
      authorEmoji: users.avatarEmoji,
      authorColor: users.avatarColor,
    })
    .from(answers)
    .innerJoin(users, eq(answers.authorId, users.id))
    .where(eq(answers.questionId, q.id))
    .orderBy(asc(answers.createdAt));

  return (
    <AppShell>
      <Link
        href={session.user.role === "teacher" ? `/klassen/${q.classId}/forum` : "/sus/forum"}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zum Forum
      </Link>

      <QuestionDetailClient
        question={JSON.parse(JSON.stringify(q))}
        klass={JSON.parse(JSON.stringify(klass))}
        author={JSON.parse(JSON.stringify(author))}
        answers={JSON.parse(JSON.stringify(answerList))}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </AppShell>
  );
}
