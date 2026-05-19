import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions, groups, groupMembers, studentNotes } from "@/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowLeft, Flame, Star, Trophy, TrendingUp, MessageCircle, KeyRound } from "lucide-react";
import { levelTitle, xpForNextLevel } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { PinResetButton } from "./PinResetButton";
import { NotesPanel } from "./NotesPanel";

const typeLabels: Record<string, string> = {
  quiz: "Quiz", flashcards: "Karteikarten", image_hotspot: "Bilderrätsel", cloze: "Lückentext", case_study: "Fallstudie",
};

export default async function StudentDetail({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const klass = await db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.teacherId, session.user.id)),
  });
  if (!klass) notFound();

  const membership = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, id), eq(classMembers.userId, userId)),
  });
  if (!membership) notFound();

  const student = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!student) notFound();

  // Aufgaben der Klasse + Abgaben des Schülers
  const classTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  const taskIds = classTasks.map((t) => t.id);
  const subs = taskIds.length
    ? await db.query.submissions.findMany({
        where: and(eq(submissions.userId, userId), inArray(submissions.taskId, taskIds)),
      })
    : [];
  const subByTask = Object.fromEntries(subs.map((s) => [s.taskId, s]));

  const scores = subs.filter((s) => s.scorePct != null).map((s) => s.scorePct!);
  const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const totalEarned = subs.reduce((a, s) => a + s.xpEarned, 0);

  // Gruppe innerhalb der Klasse?
  const classGroups = await db.query.groups.findMany({ where: eq(groups.classId, id) });
  const myGroupLink = classGroups.length
    ? await db.query.groupMembers.findFirst({
        where: and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, classGroups.map((g) => g.id))),
      })
    : null;
  const myGroup = myGroupLink ? classGroups.find((g) => g.id === myGroupLink.groupId) : null;

  // Lehrer-Notizen zu diesem Schüler (mit Autor-Info)
  const notesRaw = await db
    .select({
      id: studentNotes.id,
      body: studentNotes.body,
      createdAt: studentNotes.createdAt,
      updatedAt: studentNotes.updatedAt,
      authorId: studentNotes.authorId,
      authorName: users.displayName,
    })
    .from(studentNotes)
    .innerJoin(users, eq(studentNotes.authorId, users.id))
    .where(eq(studentNotes.studentId, userId))
    .orderBy(desc(studentNotes.createdAt));

  const nextLvlXp = xpForNextLevel(student.level);
  const lvlProgress = Math.min(100, Math.round((student.xp / nextLvlXp) * 100));

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu {klass.name}
      </Link>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Avatar user={student} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{student.displayName}</h1>
          <p className="text-sm text-slate-500">
            {levelTitle(student.level)} · Level {student.level} · {klass.name}
            {myGroup && (
              <>
                {" "}· <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: myGroup.color ?? "#888" }} />
                  {myGroup.name}
                </span>
              </>
            )}
          </p>
        </div>
        <Link href={`/nachrichten/${student.id}`}>
          <Button variant="secondary" size="sm">
            <MessageCircle className="w-4 h-4" /> Nachricht
          </Button>
        </Link>
        <PinResetButton studentId={student.id} studentName={student.displayName} hasPin={!!student.pinHash} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="!p-4">
          <Star className="w-5 h-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold">{student.xp}</div>
          <div className="text-xs text-slate-500">XP gesamt</div>
        </Card>
        <Card className="!p-4">
          <Flame className="w-5 h-5 text-orange-500 mb-2" />
          <div className="text-2xl font-bold">{student.streakDays}</div>
          <div className="text-xs text-slate-500">Tage Streak</div>
        </Card>
        <Card className="!p-4">
          <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-bold">{meanScore != null ? `${meanScore.toFixed(0)}%` : "–"}</div>
          <div className="text-xs text-slate-500">Ø Score</div>
        </Card>
        <Card className="!p-4">
          <Trophy className="w-5 h-5 text-violet-500 mb-2" />
          <div className="text-2xl font-bold">{subs.length} / {classTasks.length}</div>
          <div className="text-xs text-slate-500">Abgegeben</div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Level-Fortschritt</span>
          <span className="text-xs text-slate-500">{student.xp} / {nextLvlXp} XP</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full" style={{ width: `${lvlProgress}%` }} />
        </div>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Aufgaben &amp; Abgaben</h2>
      {classTasks.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm">Noch keine Aufgaben in dieser Klasse.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {classTasks.map((t) => {
            const sub = subByTask[t.id];
            const score = sub?.scorePct;
            const cellColor =
              score == null ? "bg-slate-100 dark:bg-slate-800 text-slate-400" :
              score >= 90 ? "bg-emerald-500 text-white" :
              score >= 70 ? "bg-emerald-300 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100" :
              score >= 50 ? "bg-amber-300 dark:bg-amber-700 text-amber-900 dark:text-amber-100" :
              "bg-rose-300 dark:bg-rose-800 text-rose-900 dark:text-rose-100";
            return (
              <Card key={t.id} className="!py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <Badge>{typeLabels[t.type] ?? t.type}</Badge>
                    <span>{t.xpReward} XP</span>
                    {!t.publishedAt && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Entwurf</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {sub && (
                    <span className="text-xs text-slate-500">
                      +{sub.xpEarned} XP
                    </span>
                  )}
                  <div className={`min-w-[3.5rem] h-9 rounded-lg flex items-center justify-center text-sm font-bold ${cellColor}`}>
                    {score != null ? `${Math.round(score)}%` : "–"}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <NotesPanel
          studentId={student.id}
          currentUserId={session.user.id}
          initialNotes={JSON.parse(JSON.stringify(notesRaw))}
        />
      </div>
    </AppShell>
  );
}
