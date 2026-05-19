import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contentItems, classes, classTeachers } from "@/db/schema";
import { eq, desc, or, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { BibliothekClient } from "./BibliothekClient";

export default async function BibliothekPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const items = await db.query.contentItems.findMany({
    where: eq(contentItems.schoolId, session.user.schoolId),
    orderBy: [desc(contentItems.createdAt)],
  });

  // Klassen, die ich verwalte (eigene + Co-Teacher)
  const owned = await db.query.classes.findMany({ where: eq(classes.teacherId, session.user.id) });
  const co = await db.query.classTeachers.findMany({ where: eq(classTeachers.userId, session.user.id) });
  const ids = Array.from(new Set([...owned.map((c) => c.id), ...co.map((c) => c.classId)]));
  const myClasses = ids.length
    ? await db.query.classes.findMany({ where: inArray(classes.id, ids) })
    : [];

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Library className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inhalts-Bibliothek</h1>
            <p className="text-sm text-slate-500">
              Sammle Lernmaterial — daraus erstellst du dann Aufgaben.
            </p>
          </div>
        </div>
        <Link href="/bibliothek/neu">
          <Button><Plus className="w-4 h-4" /> Neuer Inhalt</Button>
        </Link>
      </div>

      <BibliothekClient
        items={JSON.parse(JSON.stringify(items))}
        myClasses={JSON.parse(JSON.stringify(myClasses))}
      />
    </AppShell>
  );
}
