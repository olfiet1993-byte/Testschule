import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classMembers, questions, answers, users, classes } from "@/db/schema";
import { eq, inArray, desc, count } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { MessageCircle, CheckCircle2 } from "lucide-react";

export default async function StudentForum() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, session.user.id),
  });
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) {
    return (
      <AppShell>
        <p className="text-slate-500">Du bist in keiner Klasse.</p>
      </AppShell>
    );
  }

  const classList = await db.query.classes.findMany({ where: inArray(classes.id, classIds) });
  const classNameById = Object.fromEntries(classList.map((c) => [c.id, c.name]));

  const qList = await db
    .select({
      id: questions.id,
      classId: questions.classId,
      title: questions.title,
      body: questions.body,
      resolved: questions.resolved,
      createdAt: questions.createdAt,
      authorId: users.id,
      authorName: users.displayName,
      authorEmoji: users.avatarEmoji,
      authorColor: users.avatarColor,
    })
    .from(questions)
    .innerJoin(users, eq(questions.authorId, users.id))
    .where(inArray(questions.classId, classIds))
    .orderBy(desc(questions.createdAt));

  const answerCounts: Record<string, number> = {};
  for (const q of qList) {
    const [r] = await db.select({ v: count() }).from(answers).where(eq(answers.questionId, q.id));
    answerCounts[q.id] = r.v;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-sky-600" /> Forum
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Fragen aus deinen Klassen. Tippe eine Klasse an, um Fragen zu stellen.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {classList.map((c) => (
          <Link key={c.id} href={`/klassen/${c.id}/forum`}>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-90 transition cursor-pointer"
              style={{ background: c.color + "33", color: c.color }}
            >
              + Frage in {c.name}
            </span>
          </Link>
        ))}
      </div>

      {qList.length === 0 ? (
        <Card className="text-center py-8">
          <MessageCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Fragen in deinen Klassen.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {qList.map((q) => (
            <Link key={q.id} href={`/forum/${q.id}`}>
              <Card className="!py-3 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start gap-3">
                  <Avatar
                    user={{
                      id: q.authorId,
                      displayName: q.authorName,
                      avatarEmoji: q.authorEmoji,
                      avatarColor: q.authorColor,
                    }}
                    size={36}
                  />
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
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{q.authorName}</span>
                      <span>·</span>
                      <span>{classNameById[q.classId]}</span>
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
