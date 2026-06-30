/**
 * Agent Tasks API
 *
 * Platzierung: src/app/api/agent/tasks/route.ts
 *
 * GET  /api/agent/tasks          → alle Tasks (Admin)
 * POST /api/agent/tasks          → neuen Task einreichen (Admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { submitTask } from "@/lib/agent/orchestrator";

// ── Auth-Guard ────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "admin") return null;
  return user;
}

// ── GET: Task-Liste ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tasks = await db
    .select()
    .from(schema.agentTasks)
    .where(status ? eq(schema.agentTasks.status, status as "pending" | "in_progress" | "success" | "failed" | "escalated") : undefined)
    .orderBy(desc(schema.agentTasks.createdAt))
    .limit(50);

  return NextResponse.json({ tasks });
}

// ── POST: Task einreichen ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, title, description, affectedFiles, reproSteps, priority } = body;

  if (!type || !title || !description) {
    return NextResponse.json(
      { error: "type, title und description sind pflicht" },
      { status: 400 }
    );
  }

  const validTypes = ["bugfix", "feature", "test", "review"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `type muss einer von: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const taskId = await submitTask({
    type,
    title,
    description,
    affectedFiles,
    reproSteps,
    priority,
    submittedBy: user.id,
  });

  return NextResponse.json({ taskId, status: "pending" }, { status: 201 });
}
