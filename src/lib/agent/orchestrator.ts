/**
 * Orchestrator — Dev-Agent Phase 1
 *
 * Platzierung: src/lib/agent/orchestrator.ts
 *
 * Zuständig für:
 * - Task-Queue verwalten (agent_tasks Tabelle)
 * - Tasks an den Dev-Agent dispatchen
 * - Ergebnisse loggen & eskalieren
 *
 * Starten: npx tsx src/lib/agent/orchestrator.ts
 * Oder als Hintergrundprozess: pm2 start src/lib/agent/orchestrator.ts --interpreter tsx
 */

import { db } from "@/db";
import { agentTasks } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runDevAgent } from "./dev-agent";

// ─── Typen ───────────────────────────────────────────────────────────────────

export type TaskType = "bugfix" | "feature" | "test" | "review";
export type TaskStatus = "pending" | "in_progress" | "success" | "failed" | "escalated";

export interface AgentTask {
  type: TaskType;
  title: string;
  description: string;
  affectedFiles?: string[];
  reproSteps?: string;
  priority?: number; // 1=hoch, 10=niedrig
  submittedBy?: string;
}

// ─── Task einreichen ─────────────────────────────────────────────────────────

export async function submitTask(task: AgentTask): Promise<string> {
  const id = nanoid(12);
  const now = new Date();
  await db.insert(agentTasks).values({
    id,
    createdAt: now,
    updatedAt: now,
    type: task.type,
    status: "pending",
    priority: task.priority ?? 5,
    title: task.title,
    description: task.description,
    affectedFiles: task.affectedFiles ? JSON.stringify(task.affectedFiles) : null,
    reproSteps: task.reproSteps ?? null,
    submittedBy: task.submittedBy ?? "orchestrator",
  });
  console.log(`[Orchestrator] Task eingereicht: ${id} — ${task.title}`);
  return id;
}

// ─── Nächsten pending Task holen ──────────────────────────────────────────────

async function getNextTask() {
  const [task] = await db
    .select()
    .from(agentTasks)
    .where(
      and(
        eq(agentTasks.status, "pending"),
        lte(agentTasks.retries, agentTasks.maxRetries)
      )
    )
    .orderBy(agentTasks.priority, agentTasks.createdAt)
    .limit(1);
  return task ?? null;
}

// ─── Task-Status updaten ──────────────────────────────────────────────────────

async function updateTask(
  id: string,
  update: Partial<{
    status: TaskStatus;
    branchName: string;
    prUrl: string;
    resultSummary: string;
    errorLog: string;
    retries: number;
    tokenCostMicroEur: number;
  }>
) {
  await db
    .update(agentTasks)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(agentTasks.id, id));
}

// ─── Haupt-Loop ──────────────────────────────────────────────────────────────

export async function runOrchestrator(options: { intervalMs?: number } = {}) {
  const interval = options.intervalMs ?? 30_000; // alle 30 Sekunden prüfen
  console.log(`[Orchestrator] Gestartet. Prüfe alle ${interval / 1000}s auf neue Tasks.`);

  while (true) {
    const task = await getNextTask();

    if (!task) {
      await sleep(interval);
      continue;
    }

    console.log(`[Orchestrator] Verarbeite Task: ${task.id} — ${task.title}`);

    await updateTask(task.id, { status: "in_progress" });

    try {
      const result = await runDevAgent({
        taskId: task.id,
        type: task.type as TaskType,
        title: task.title,
        description: task.description,
        affectedFiles: task.affectedFiles ? JSON.parse(task.affectedFiles) : [],
        reproSteps: task.reproSteps ?? undefined,
      });

      if (result.success) {
        await updateTask(task.id, {
          status: "success",
          branchName: result.branchName,
          prUrl: result.prUrl,
          resultSummary: result.summary,
          tokenCostMicroEur: result.tokenCostMicroEur ?? 0,
        });
        console.log(`[Orchestrator] ✅ Erfolgreich: ${task.id} — PR: ${result.prUrl}`);
      } else {
        const newRetries = (task.retries ?? 0) + 1;
        const status: TaskStatus = newRetries > (task.maxRetries ?? 2) ? "escalated" : "pending";
        await updateTask(task.id, {
          status,
          retries: newRetries,
          errorLog: result.error,
        });
        if (status === "escalated") {
          await notifyEscalation(task.id, task.title, result.error ?? "Unbekannter Fehler");
        }
        console.log(`[Orchestrator] ❌ Fehlgeschlagen (${newRetries}/${task.maxRetries}): ${task.id}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await updateTask(task.id, {
        status: "failed",
        errorLog: errorMsg,
      });
      console.error(`[Orchestrator] Unerwarteter Fehler bei Task ${task.id}:`, errorMsg);
    }

    // Kurze Pause zwischen Tasks
    await sleep(5_000);
  }
}

// ─── Eskalation ───────────────────────────────────────────────────────────────

async function notifyEscalation(taskId: string, title: string, error: string) {
  // TODO Phase 2: E-Mail / Slack / In-App Notification
  // Fürs Erste: in die notifications-Tabelle schreiben (bereits im Schema)
  console.warn(`[Orchestrator] ⚠ ESKALATION: Task ${taskId} — ${title}`);
  console.warn(`  Fehler: ${error}`);
  // Hier später: db.insert(notifications).values({ ... })
}

// ─── Hilfsfunktion ────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── CLI-Einstieg ─────────────────────────────────────────────────────────────

if (process.argv[1]?.endsWith("orchestrator.ts")) {
  runOrchestrator().catch(console.error);
}
