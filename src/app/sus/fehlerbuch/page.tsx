import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { submissions, tasks, classes, classMembers } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { BookX, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import Link from "next/link";
import { DIFFICULTY_LABEL } from "@/components/DifficultySelect";

const TYPE_EMOJI: Record<string, string> = {
  quiz: "❓",
  flashcards: "🃏",
  cloze: "✍️",
  case_study: "🏥",
  image_hotspot: "🖼️",
};

export default async function FehlerbuchPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  // Alle eigenen Abgaben holen
  const mySubs = await db.query.submissions.findMany({
    where: eq(submissions.userId, session.user.id),
    orderBy: [desc(submissions.submittedAt)],
  });

  // Pro Aufgabe nur die neueste Abgabe behalten
  const latestByTask = new Map<string, typeof mySubs[0]>();
  for (const s of mySubs) {
    if (!latestByTask.has(s.taskId)) latestByTask.set(s.taskId, s);
  }

  // Nur Fehler (scorePct < 100%)
  const mistakeSubs = Array.from(latestByTask.values()).filter((s) => {
    if (s.scorePct == null) return false;
    return s.scorePct < 100;
  });

  const taskIds = mistakeSubs.map((s) => s.taskId);
  const myTasks = taskIds.length
    ? await db.query.tasks.findMany({ where: inArray(tasks.id, taskIds) })
    : [];
  const taskMap = Object.fromEntries(myTasks.map((t) => [t.id, t]));
  const classIds = Array.from(new Set(myTasks.map((t) => t.classId)));
  const myClasses = classIds.length
    ? await db.query.classes.findMany({ where: inArray(classes.id, classIds) })
    : [];
  const classMap = Object.fromEntries(myClasses.map((c) => [c.id, c]));

  // Score-Buckets
  const buckets = {
    rough: mistakeSubs.filter((s) => s.scorePct! < 50),
    middle: mistakeSubs.filter((s) => s.scorePct! >= 50 && s.scorePct! < 80),
    nearly: mistakeSubs.filter((s) => s.scorePct! >= 80),
  };

  function renderItem(s: typeof mistakeSubs[0]) {
    const t = taskMap[s.taskId];
    if (!t) return null;
    const klass = classMap[t.classId];
    const pct = Math.round(s.scorePct!);
    const diff = t.difficulty ? DIFFICULTY_LABEL[t.difficulty] : null;
    return (
      <Link key={s.id} href={`/sus/aufgaben/${t.id}`}>
        <Card className="!p-4 hover-lift cursor-pointer">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: (klass?.color ?? "#888") + "22" }}
            >
              {TYPE_EMOJI[t.type] ?? "📝"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{t.title}</div>
              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                <span style={{ color: klass?.color }}>{klass?.name}</span>
                {diff && <Badge className={`text-[10px] ${diff.color}`}>{diff.label}</Badge>}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(s.submittedAt).toLocaleDateString("de-DE")}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-2xl font-bold ${pct >= 80 ? "text-amber-600" : pct >= 50 ? "text-orange-600" : "text-rose-600"}`}>
                {pct}%
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 self-center flex-shrink-0" />
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
          <BookX className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mein Fehlerbuch</h1>
          <p className="text-sm text-slate-500">
            Aufgaben, bei denen noch Luft nach oben ist. Klicke eine an, um sie nochmal zu probieren.
          </p>
        </div>
      </div>

      {mistakeSubs.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="font-bold mb-1">Keine offenen Fehler!</h2>
          <p className="text-sm text-slate-500">
            Du hast bei jeder Aufgabe deinen besten Versuch perfekt gemacht — oder hast noch keine Aufgabe gelöst.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {buckets.rough.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Klare Wiederholung ({buckets.rough.length})
              </h2>
              <div className="space-y-2">{buckets.rough.map(renderItem)}</div>
            </section>
          )}
          {buckets.middle.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-2">
                Üben empfohlen ({buckets.middle.length})
              </h2>
              <div className="space-y-2">{buckets.middle.map(renderItem)}</div>
            </section>
          )}
          {buckets.nearly.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">
                Fast perfekt ({buckets.nearly.length})
              </h2>
              <div className="space-y-2">{buckets.nearly.map(renderItem)}</div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
