import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, questions, answers, users } from "@/db/schema";
import { and, eq, desc, count } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { ArrowLeft, MessageCircle, CheckCircle2, Plus } from "lucide-react";
import { NewQuestionForm } from "./NewQuestionForm";

export default async function ClassForum({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Zugriff prüfen
  let hasAccess = false;
  if (session.user.role === "teacher") {
    const c = await db.query.classes.findFirst({
      where: and(eq(classes.id, id), eq(classes.teacherId, session.user.id)),
    });
    hasAccess = !!c;
  } else {
    const m = await db.query.classMembers.findFirst({
      where: (cm, { eq, and }) => and(eq(cm.classId, id), eq(cm.userId, session.user.id)),
    });
    hasAccess = !!m;
  }
  if (!hasAccess) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const qList = await db
    .select({
      id: questions.id,
      title: questions.title,
      body: questions.body,
      resolved: questions.resolved,
      createdAt: questions.createdAt,
      authorName: users.displayName,
      authorEmoji: users.avatarEmoji,
      authorColor: users.avatarColor,
      authorId: users.id,
    })
    .from(questions)
    .innerJoin(users, eq(questions.authorId, users.id))
    .where(eq(questions.classId, id))
    .orderBy(desc(questions.createdAt));

  // Anzahl Antworten pro Frage
  const answerCounts: Record<string, number> = {};
  for (const q of qList) {
    const [r] = await db.select({ v: count() }).from(answers).where(eq(answers.questionId, q.id));
    answerCounts[q.id] = r.v;
  }

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu {klass.name}
      </Link>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{klass.name} · Forum</h1>
          <p className="text-sm text-slate-500">Fragen + Antworten der Klasse</p>
        </div>
      </div>

      <NewQuestionForm classId={id} />

      {qList.length === 0 ? (
        <Card className="mt-6 text-center py-8">
          <MessageCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Fragen — sei die erste!</p>
        </Card>
      ) : (
        <div className="space-y-2 mt-6">
          {qList.map((q) => (
            <Link key={q.id} href={`/forum/${q.id}`}>
              <Card className="!py-3 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start gap-3">
                  <Avatar user={{ id: q.authorId, displayName: q.authorName, avatarEmoji: q.authorEmoji, avatarColor: q.authorColor }} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{q.title}</span>
                      {q.resolved && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" /> gelöst
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{q.body}</p>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span>{q.authorName}</span>
                      <span>·</span>
                      <span>{new Date(q.createdAt).toLocaleDateString("de-DE")}</span>
                      <span>·</span>
                      <span>{answerCounts[q.id] ?? 0} {answerCounts[q.id] === 1 ? "Antwort" : "Antworten"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
