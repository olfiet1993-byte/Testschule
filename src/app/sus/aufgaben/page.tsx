import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tasks, classMembers, submissions, topics } from "@/db/schema";
import { eq, and, inArray, isNotNull, desc, asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Star, BookMarked } from "lucide-react";

const typeLabels: Record<string, string> = {
  quiz: "Quiz",
  flashcards: "Karteikarten",
  image_hotspot: "Bilderrätsel",
  cloze: "Lückentext",
  case_study: "Fallstudie",
};

export default async function StudentTasks() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, session.user.id),
  });
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) {
    return (
      <AppShell>
        <p className="text-slate-500">Du bist noch keiner Klasse beigetreten.</p>
      </AppShell>
    );
  }

  const myTasks = await db.query.tasks.findMany({
    where: and(inArray(tasks.classId, classIds), isNotNull(tasks.publishedAt)),
    orderBy: [desc(tasks.publishedAt)],
  });

  const mySubs = await db.query.submissions.findMany({
    where: eq(submissions.userId, session.user.id),
  });
  const subByTask = Object.fromEntries(mySubs.map((s) => [s.taskId, s]));

  const allTopics = await db.query.topics.findMany({
    where: inArray(topics.classId, classIds),
    orderBy: [asc(topics.position), asc(topics.createdAt)],
  });

  // Gruppieren nach topicId
  const grouped: Record<string, typeof myTasks> = {};
  for (const t of myTasks) {
    const key = t.topicId ?? "_none";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  function renderTaskRow(t: any) {
    const sub = subByTask[t.id];
    const done = !!sub;
    return (
      <Link key={t.id} href={`/sus/aufgaben/${t.id}`}>
        <Card className={`hover:shadow-md transition cursor-pointer ${done ? "bg-emerald-50/40 dark:bg-emerald-900/10" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${done ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"}`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <Badge>{typeLabels[t.type] ?? t.type}</Badge>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {t.xpReward} XP</span>
                  {done && (
                    <span className="text-emerald-600 font-medium">
                      {sub.scorePct?.toFixed(0)}% · +{sub.xpEarned} XP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-sm text-slate-500">{done ? "wiederholen" : "starten →"}</span>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-6">📚 Meine Aufgaben</h1>

      {myTasks.length === 0 ? (
        <Card><p className="text-slate-500">Aktuell keine Aufgaben.</p></Card>
      ) : (
        <div className="space-y-8">
          {allTopics.map((topic) => {
            const list = grouped[topic.id];
            if (!list || list.length === 0) return null;
            const done = list.filter((t) => subByTask[t.id]).length;
            const pct = Math.round((done / list.length) * 100);
            return (
              <section key={topic.id}>
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-4 h-4 text-violet-500" />
                  <h2 className="text-lg font-semibold">{topic.title}</h2>
                  <span className="text-xs text-slate-500 ml-2">{done} / {list.length}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="space-y-2">{list.map(renderTaskRow)}</div>
              </section>
            );
          })}

          {grouped._none?.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-slate-600 dark:text-slate-400">
                Ohne Thema
              </h2>
              <div className="space-y-2">{grouped._none.map(renderTaskRow)}</div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
