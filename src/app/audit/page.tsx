import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { AuditFilterClient } from "./AuditFilterClient";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; days?: string; q?: string; actor?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const params = await searchParams;
  const filterAction = params.action ?? "";
  const filterActor = params.actor ?? "";
  const filterDays = Number(params.days ?? 90);
  const filterQ = (params.q ?? "").toLowerCase().trim();

  const since = new Date(Date.now() - filterDays * 24 * 60 * 60 * 1000);

  let entries = await db.query.auditLog.findMany({
    where: filterDays > 0
      ? (a, { eq, and, gte }) => and(eq(a.schoolId, session.user.schoolId), gte(a.createdAt, since))
      : (a, { eq }) => eq(a.schoolId, session.user.schoolId),
    orderBy: [desc(auditLog.createdAt)],
    limit: 1000,
  });

  if (filterAction) entries = entries.filter((e) => e.action === filterAction);
  if (filterActor) entries = entries.filter((e) => e.actorName === filterActor);
  if (filterQ) {
    entries = entries.filter((e) =>
      (e.summary + " " + e.actorName + " " + e.action).toLowerCase().includes(filterQ),
    );
  }

  const allActors = Array.from(new Set(entries.map((e) => e.actorName))).sort();

  return (
    <AppShell>
      <AuditFilterClient
        entries={JSON.parse(JSON.stringify(entries.slice(0, 500)))}
        totalShown={entries.length}
        actors={allActors}
        initialFilter={{
          action: filterAction,
          actor: filterActor,
          days: filterDays,
          q: filterQ,
        }}
      />
    </AppShell>
  );
}
