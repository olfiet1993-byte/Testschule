"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { KIDashboardClient } from "./KIDashboardClient";
import { db } from "@/db";
import { tokenLog, agentTasks } from "@/db/schema";
import { gte, desc, sql } from "drizzle-orm";

export default async function KIDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "admin") redirect("/dashboard");

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  // Monatskosten gesamt
  const [costRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${tokenLog.costMicroEur}), 0)` })
    .from(tokenLog)
    .where(gte(tokenLog.createdAt, firstOfMonth));

  // Kosten nach Call-Typ (laufender Monat)
  const costByType = await db
    .select({
      callType: tokenLog.callType,
      callCount: sql<number>`COUNT(*)`,
      costEur: sql<number>`ROUND(SUM(${tokenLog.costMicroEur}) / 1000000.0, 4)`,
    })
    .from(tokenLog)
    .where(gte(tokenLog.createdAt, firstOfMonth))
    .groupBy(tokenLog.callType)
    .orderBy(sql`SUM(${tokenLog.costMicroEur}) DESC`);

  // Täglicher Trend (letzte 30 Tage)
  const dailyTrend = await db
    .select({
      date: sql<string>`date(${tokenLog.createdAt} / 1000, 'unixepoch')`,
      callCount: sql<number>`COUNT(*)`,
      costEur: sql<number>`ROUND(SUM(${tokenLog.costMicroEur}) / 1000000.0, 4)`,
    })
    .from(tokenLog)
    .where(gte(tokenLog.createdAt, thirtyDaysAgo))
    .groupBy(sql`date(${tokenLog.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${tokenLog.createdAt} / 1000, 'unixepoch') ASC`)
    .limit(30);

  // Kosten nach Modell
  const byModel = await db
    .select({
      model: tokenLog.model,
      calls: sql<number>`COUNT(*)`,
      costEur: sql<number>`ROUND(SUM(${tokenLog.costMicroEur}) / 1000000.0, 4)`,
    })
    .from(tokenLog)
    .where(gte(tokenLog.createdAt, firstOfMonth))
    .groupBy(tokenLog.model);

  // Agent Tasks
  const recentTasks = await db
    .select()
    .from(agentTasks)
    .orderBy(desc(agentTasks.createdAt))
    .limit(20);

  const taskStats = await db
    .select({
      status: agentTasks.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(agentTasks)
    .groupBy(agentTasks.status);

  const budgetEur = Number(process.env.AI_BUDGET_SOFT_EUR ?? 50);

  return (
    <AppShell>
      <KIDashboardClient
        monthlyCostEur={Number(((costRow?.total ?? 0) / 1_000_000).toFixed(4))}
        budgetEur={budgetEur}
        costByType={costByType}
        dailyTrend={dailyTrend}
        byModel={byModel}
        recentTasks={recentTasks.map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          status: t.status,
          branchName: t.branchName ?? null,
          prUrl: t.prUrl ?? null,
          createdAt: t.createdAt instanceof Date ? t.createdAt.getTime() : Number(t.createdAt),
          retries: t.retries,
        }))}
        taskStats={taskStats}
      />
    </AppShell>
  );
}
