import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tasks, classes, submissions } from "@/db/schema";
import { eq, desc, count, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { TaskListClient } from "./TaskListClient";

export default async function AufgabenPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const { manageableClassIds } = await import("@/lib/permissions");
  const myClassIds = await manageableClassIds(session.user.id);
  const myClasses = myClassIds.length
    ? await db.query.classes.findMany({ where: inArray(classes.id, myClassIds) })
    : [];
  const classIds = myClasses.map((c) => c.id);
  const classMap = Object.fromEntries(myClasses.map((c) => [c.id, c]));

  const allTasks = classIds.length
    ? await db.query.tasks.findMany({
        where: inArray(tasks.classId, classIds),
        orderBy: [desc(tasks.createdAt)],
      })
    : [];

  const subCounts = await Promise.all(
    allTasks.map(async (t) => {
      const [r] = await db.select({ v: count() }).from(submissions).where(eq(submissions.taskId, t.id));
      return [t.id, r.v] as const;
    })
  );
  const subMap = Object.fromEntries(subCounts);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Aufgaben</h1>
          <p className="text-sm text-slate-500">Erstelle Quiz auf Basis deiner Bibliothek.</p>
        </div>
        <Link href="/aufgaben/neu">
          <Button><Plus className="w-4 h-4" /> Neue Aufgabe</Button>
        </Link>
      </div>

      {allTasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center py-12 shadow-sm">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-3">Noch keine Aufgaben erstellt.</p>
          <Link href="/aufgaben/neu">
            <Button>Erste Aufgabe erstellen</Button>
          </Link>
        </div>
      ) : (
        <TaskListClient
          tasks={JSON.parse(JSON.stringify(allTasks))}
          classMap={JSON.parse(JSON.stringify(classMap))}
          subMap={subMap}
        />
      )}
    </AppShell>
  );
}
