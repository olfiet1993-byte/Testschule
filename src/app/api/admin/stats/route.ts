/**
 * Admin Stats API
 * GET /api/admin/stats
 *
 * Platzierung: src/app/api/admin/stats/route.ts
 *
 * Zugriff: nur für Nutzer mit role === 'admin'
 * DSGVO: keine Klarnamen, keine Einzelprofile
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { sql, gte, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // ── Auth: nur Admin ──────────────────────────────────────────────────
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "overview";

  try {
    if (section === "tokens") return tokenSection();
    return overviewSection();
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// ─── Übersichts-Dashboard ────────────────────────────────────────────────
async function overviewSection() {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  // Monatskosten gesamt
  const [costRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${schema.tokenLog.costMicroEur}), 0)` })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, firstOfMonth));

  const monthlyCostMicroEur = costRow?.total ?? 0;
  const budgetEur = Number(process.env.AI_BUDGET_SOFT_EUR ?? 50);

  // Tägliche Trends (letzte 30 Tage)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const dailyTrend = await db
    .select({
      date:         sql<string>`date(${schema.tokenLog.createdAt} / 1000, 'unixepoch')`,
      callCount:    sql<number>`COUNT(*)`,
      costEur:      sql<number>`SUM(${schema.tokenLog.costMicroEur}) / 1000000.0`,
    })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, thirtyDaysAgo))
    .groupBy(sql`date(${schema.tokenLog.createdAt} / 1000, 'unixepoch')`)
    .orderBy(sql`date(${schema.tokenLog.createdAt} / 1000, 'unixepoch') DESC`)
    .limit(30);

  // Kosten nach Call-Typ (laufender Monat)
  const costByType = await db
    .select({
      callType:  schema.tokenLog.callType,
      callCount: sql<number>`COUNT(*)`,
      costEur:   sql<number>`SUM(${schema.tokenLog.costMicroEur}) / 1000000.0`,
    })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, firstOfMonth))
    .groupBy(schema.tokenLog.callType)
    .orderBy(sql`SUM(${schema.tokenLog.costMicroEur}) DESC`);

  // Top-Lehrkräfte nach Kosten — ANONYM (kein Name, nur Rang A/B/C)
  const topTeachersRaw = await db
    .select({
      teacherId: schema.tokenLog.teacherId,
      callCount: sql<number>`COUNT(*)`,
      costEur:   sql<number>`SUM(${schema.tokenLog.costMicroEur}) / 1000000.0`,
    })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, firstOfMonth))
    .groupBy(schema.tokenLog.teacherId)
    .orderBy(sql`SUM(${schema.tokenLog.costMicroEur}) DESC`)
    .limit(5);

  const topTeachers = topTeachersRaw.map((t, i) => ({
    rank:      String.fromCharCode(65 + i), // 'A', 'B', 'C'...
    callCount: t.callCount,
    costEur:   Number(t.costEur.toFixed(2)),
  }));

  // Aktive Nutzer (letzte 7 Tage)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const [activeTeachersRow] = await db
    .select({ cnt: sql<number>`COUNT(DISTINCT ${schema.tokenLog.teacherId})` })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, sevenDaysAgo));

  // Aufgaben gesamt
  const [tasksRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(schema.tasks);

  // Abgaben heute
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [submissionsRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(schema.submissions)
    .where(gte(schema.submissions.submittedAt, todayStart));

  return NextResponse.json({
    kpis: {
      activeTeachersLast7d: activeTeachersRow?.cnt ?? 0,
      totalTasks:           tasksRow?.cnt ?? 0,
      submissionsToday:     submissionsRow?.cnt ?? 0,
    },
    ai: {
      monthlyCostEur:  monthlyCostMicroEur / 1_000_000,
      budgetLimitEur:  budgetEur,
      budgetUsedPct:   Math.round((monthlyCostMicroEur / (budgetEur * 1_000_000)) * 100),
      costByType,
      topTeachers,     // Kein Klarname — nur Rang
    },
    dailyTrend: dailyTrend.slice(0, 7).reverse(),
    meta: {
      generatedAt: new Date().toISOString(),
      dsgvo: "Keine personenbezogenen Daten. Lehrkräfte anonymisiert (Rang A/B/C).",
    },
  });
}

// ─── Token-Detail ────────────────────────────────────────────────────────
async function tokenSection() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

  const byModel = await db
    .select({
      model:    schema.tokenLog.model,
      calls:    sql<number>`COUNT(*)`,
      costEur:  sql<number>`SUM(${schema.tokenLog.costMicroEur}) / 1000000.0`,
      inputTok: sql<number>`SUM(${schema.tokenLog.inputTokens})`,
      outTok:   sql<number>`SUM(${schema.tokenLog.outputTokens})`,
    })
    .from(schema.tokenLog)
    .where(gte(schema.tokenLog.createdAt, ninetyDaysAgo))
    .groupBy(schema.tokenLog.model);

  return NextResponse.json({ byModel });
}
