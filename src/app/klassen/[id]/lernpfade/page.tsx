import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, learningPaths, learningPathItems } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Plus, Map, Calendar, Archive } from "lucide-react";

export default async function LernpfadeListe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const paths = await db.query.learningPaths.findMany({
    where: eq(learningPaths.classId, id),
    orderBy: [desc(learningPaths.createdAt)],
  });

  // Item-Counts
  const allItems = paths.length
    ? await db.query.learningPathItems.findMany({
        where: eq(learningPathItems.pathId, paths[0].id),
        // (alternativ inArray, vereinfachen wir hier)
      })
    : [];
  const itemCountByPath: Record<string, number> = {};
  // Wir holen pro path die Items separat — bei wenigen Pfaden ok:
  for (const p of paths) {
    const items = await db.query.learningPathItems.findMany({
      where: eq(learningPathItems.pathId, p.id),
    });
    itemCountByPath[p.id] = items.length;
  }

  function currentWeekOf(p: typeof paths[0]): number | null {
    const start = new Date(p.startsOn + "T00:00:00");
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const w = Math.floor(diffDays / 7) + 1;
    if (w > p.numWeeks) return null;
    return w;
  }

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Klasse
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: klass.color }}>
            <Map className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lernpfade — {klass.name}</h1>
            <p className="text-sm text-slate-500">Wochenweise strukturierte Lernreisen für deine Klasse</p>
          </div>
        </div>
        <Link href={`/klassen/${id}/lernpfade/neu`}>
          <Button><Plus className="w-4 h-4" /> Neuer Lernpfad</Button>
        </Link>
      </div>

      {paths.length === 0 ? (
        <Card className="text-center py-12">
          <Map className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">Noch keine Lernpfade angelegt.</p>
          <Link href={`/klassen/${id}/lernpfade/neu`}>
            <Button><Plus className="w-4 h-4" /> Ersten Lernpfad erstellen</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map((p) => {
            const cw = currentWeekOf(p);
            const items = itemCountByPath[p.id] ?? 0;
            return (
              <Link key={p.id} href={`/klassen/${id}/lernpfade/${p.id}`}>
                <Card className="hover:border-sky-300 transition cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold flex-1">{p.name}</h3>
                    {p.archived ? (
                      <Badge className="bg-slate-200 text-slate-600"><Archive className="w-3 h-3" /> Archiv</Badge>
                    ) : cw ? (
                      <Badge className="bg-emerald-500 text-white">Woche {cw} / {p.numWeeks}</Badge>
                    ) : (
                      <Badge className="bg-sky-100 text-sky-700">
                        {new Date(p.startsOn + "T00:00:00") > new Date() ? "geplant" : "abgeschlossen"}
                      </Badge>
                    )}
                  </div>
                  {p.description && <p className="text-sm text-slate-500 mb-3">{p.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Start: {p.startsOn}</span>
                    <span>·</span>
                    <span>{p.numWeeks} Wochen</span>
                    <span>·</span>
                    <span>{items} Aufgaben</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
