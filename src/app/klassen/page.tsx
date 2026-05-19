import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, yearGroups } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClass } from "@/lib/actions/classes";
import Link from "next/link";
import { Users, Plus } from "lucide-react";

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const { manageableClassIds } = await import("@/lib/permissions");
  const myClassIds = await manageableClassIds(session.user.id);
  const [myClasses, years] = await Promise.all([
    myClassIds.length > 0
      ? db.query.classes.findMany({
          where: (c, { inArray }) => inArray(c.id, myClassIds),
          with: { yearGroup: true },
        })
      : Promise.resolve([] as any[]),
    db.query.yearGroups.findMany({
      where: eq(yearGroups.schoolId, session.user.schoolId),
      orderBy: (y, { asc }) => [asc(y.position)],
    }),
  ]);

  const counts = await Promise.all(
    myClasses.map(async (c) => {
      const [r] = await db.select({ v: count() }).from(classMembers).where(eq(classMembers.classId, c.id));
      return [c.id, r.v] as const;
    })
  );
  const countMap = Object.fromEntries(counts);

  return (
    <AppShell>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Klassen & Gruppen</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {myClasses.map((c) => (
            <Link key={c.id} href={`/klassen/${c.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: c.color }} />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{c.name}</h3>
                    <p className="text-sm text-slate-500">{c.yearGroup?.name ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <Users className="w-5 h-5 text-slate-400" />
                      {countMap[c.id] ?? 0}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">Code: {c.inviteCode}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {myClasses.length === 0 && (
            <Card><p className="text-slate-500">Noch keine Klassen — lege rechts eine an.</p></Card>
          )}
        </div>

        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Neue Klasse</h2>
          <form action={createClass} className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="z. B. PF24a" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="yearGroupId">Jahrgang</Label>
              <select
                id="yearGroupId"
                name="yearGroupId"
                className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
              >
                <option value="">— bitte wählen —</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="color">Farbe</Label>
              <input
                type="color"
                id="color"
                name="color"
                defaultValue="#0ea5e9"
                className="w-full h-10 mt-1 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              />
            </div>
            <Button type="submit" className="w-full">Klasse anlegen</Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
