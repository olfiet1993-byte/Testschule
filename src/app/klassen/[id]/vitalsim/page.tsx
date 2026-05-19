import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, vitalScenarios } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VitalScenarioManager } from "./VitalScenarioManager";

export default async function VitalSimManagerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const scenarios = await db.query.vitalScenarios.findMany({
    where: eq(vitalScenarios.classId, id),
    orderBy: [desc(vitalScenarios.createdAt)],
  });

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Klasse
      </Link>
      <VitalScenarioManager
        classId={id}
        className={klass.name}
        scenarios={JSON.parse(JSON.stringify(scenarios))}
      />
    </AppShell>
  );
}
