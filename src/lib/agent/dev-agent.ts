/**
 * Dev-Agent — Phase 1
 *
 * Platzierung: src/lib/agent/dev-agent.ts
 *
 * Ablauf:
 * 1. Branch erstellen
 * 2. Claude Code (--print, non-interaktiv) ausführen
 * 3. TypeScript-Check
 * 4. Playwright E2E-Tests
 * 5. Bei Erfolg: PR öffnen
 * 6. Bei Fehler: Branch aufräumen, Fehler zurückgeben
 */

import { execSync, spawnSync } from "node:child_process";
import path from "node:path";

// ─── Konfiguration ────────────────────────────────────────────────────────────

const REPO_PATH = process.env.REPO_PATH ?? path.join(process.cwd());
const GITHUB_TOKEN = process.env.GITHUB_SERVICE_TOKEN ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "olfiet1993-byte/Testschule";
const BASE_BRANCH = process.env.BASE_BRANCH ?? "main";

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface DevAgentInput {
  taskId: string;
  type: "bugfix" | "feature" | "test" | "review";
  title: string;
  description: string;
  affectedFiles?: string[];
  reproSteps?: string;
}

export interface DevAgentResult {
  success: boolean;
  branchName?: string;
  prUrl?: string;
  summary?: string;
  error?: string;
  tokenCostMicroEur?: number;
}

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

export async function runDevAgent(input: DevAgentInput): Promise<DevAgentResult> {
  const prefix = input.type === "bugfix" ? "fix" : "feat";
  const branchName = `${prefix}/${input.taskId}-${slugify(input.title)}`;

  console.log(`[Dev-Agent] Starte: ${branchName}`);

  // ── 1. Branch erstellen ───────────────────────────────────────────────────
  try {
    exec(`git -C "${REPO_PATH}" checkout ${BASE_BRANCH}`);
    exec(`git -C "${REPO_PATH}" pull origin ${BASE_BRANCH}`);
    exec(`git -C "${REPO_PATH}" checkout -b ${branchName}`);
  } catch (err) {
    return { success: false, error: `Branch-Erstellung fehlgeschlagen: ${err}` };
  }

  // ── 2. Claude Code ausführen ──────────────────────────────────────────────
  let claudeOutput = "";
  try {
    claudeOutput = await runClaudeCode(input);
    console.log(`[Dev-Agent] Claude Code Output (${claudeOutput.length} Zeichen)`);
  } catch (err) {
    await cleanupBranch(branchName);
    return { success: false, branchName, error: `Claude Code fehlgeschlagen: ${err}` };
  }

  // ── 3. Änderungen committen ───────────────────────────────────────────────
  try {
    exec(`git -C "${REPO_PATH}" add -A`);
    const status = exec(`git -C "${REPO_PATH}" status --short`);
    if (!status.trim()) {
      await cleanupBranch(branchName);
      return { success: false, branchName, error: "Claude Code hat keine Änderungen gemacht" };
    }
    exec(`git -C "${REPO_PATH}" commit -m "[Dev-Agent] ${input.type}: ${input.title}"`);
  } catch (err) {
    await cleanupBranch(branchName);
    return { success: false, branchName, error: `Commit fehlgeschlagen: ${err}` };
  }

  // ── 4. TypeScript-Check ───────────────────────────────────────────────────
  try {
    exec(`cd "${REPO_PATH}" && npm run typecheck`, { timeout: 60_000 });
    console.log(`[Dev-Agent] ✅ TypeScript OK`);
  } catch (err) {
    // Retry-Signal: TypeScript-Fehler zurückgeben für nächsten Versuch
    await cleanupBranch(branchName);
    return { success: false, branchName, error: `TypeScript-Fehler:\n${err}` };
  }

  // ── 5. Playwright E2E-Tests ───────────────────────────────────────────────
  try {
    exec(
      `cd "${REPO_PATH}" && DATABASE_URL=./data/e2e.db AUTH_SECRET=${process.env.AUTH_SECRET ?? "e2e_secret"} AUTH_TRUST_HOST=true npm run test:e2e`,
      { timeout: 180_000 }
    );
    console.log(`[Dev-Agent] ✅ Playwright-Tests bestanden`);
  } catch (err) {
    await cleanupBranch(branchName);
    return { success: false, branchName, error: `Playwright-Tests fehlgeschlagen:\n${err}` };
  }

  // ── 6. Push & PR öffnen ───────────────────────────────────────────────────
  try {
    exec(`git -C "${REPO_PATH}" push origin ${branchName}`);
    const prUrl = await openPR(branchName, input);
    return {
      success: true,
      branchName,
      prUrl,
      summary: `${input.type}: ${input.title} — TypeCheck ✅, E2E ✅`,
    };
  } catch (err) {
    return { success: false, branchName, error: `Push/PR fehlgeschlagen: ${err}` };
  }
}

// ─── Claude Code non-interaktiv aufrufen ──────────────────────────────────────

async function runClaudeCode(input: DevAgentInput): Promise<string> {
  const affectedFiles = input.affectedFiles?.length
    ? `\nBetroffene Dateien: ${input.affectedFiles.join(", ")}`
    : "";

  const reproSteps = input.reproSteps
    ? `\nRepro-Schritte: ${input.reproSteps}`
    : "";

  const prompt = `Du bist ein Dev-Agent für die Testschule-App.
Stack: Next.js 16 App Router, Drizzle ORM + better-sqlite3, TypeScript strict, Tailwind v4.

Task-ID: ${input.taskId}
Typ: ${input.type}
Titel: ${input.title}
Beschreibung: ${input.description}${affectedFiles}${reproSteps}

Regeln:
- Minimaler Diff — nur das Nötigste ändern
- Keine neuen Abhängigkeiten ohne guten Grund
- TypeScript strict — keine any ohne Kommentar
- Keine Änderungen an src/lib/auth.ts (sicherheitskritisch)
- Keine DB-Migrationen ohne explizite Anweisung
- Nach der Änderung: kurzer Kommentar was und warum geändert wurde

Führe die Änderung jetzt durch.`;

  const result = spawnSync("claude", ["--print", prompt], {
    cwd: REPO_PATH,
    timeout: 120_000,
    encoding: "utf8",
    env: { ...process.env, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Claude Code Fehler");

  return result.stdout;
}

// ─── PR öffnen via GitHub API ─────────────────────────────────────────────────

async function openPR(branchName: string, input: DevAgentInput): Promise<string> {
  const body = {
    title: `[Dev-Agent] ${input.type}: ${input.title}`,
    body: [
      `🤖 Automatisch generiert vom Dev-Agent`,
      ``,
      `**Task:** ${input.taskId}`,
      `**Typ:** ${input.type}`,
      ``,
      `**Beschreibung:**`,
      input.description,
      ``,
      `**Checks:**`,
      `- TypeScript: ✅`,
      `- Playwright E2E: ✅`,
      ``,
      `> Bitte vor dem Merge kurz prüfen — bei Unklarheiten Task als "escalated" markieren.`,
    ].join("\n"),
    head: branchName,
    base: BASE_BRANCH,
  };

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "testschule-dev-agent",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PR API Fehler: ${res.status} — ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { html_url: string };
  return data.html_url;
}

// ─── Branch aufräumen ─────────────────────────────────────────────────────────

async function cleanupBranch(branchName: string) {
  try {
    exec(`git -C "${REPO_PATH}" checkout ${BASE_BRANCH}`);
    exec(`git -C "${REPO_PATH}" branch -D ${branchName}`);
    console.log(`[Dev-Agent] Branch gelöscht: ${branchName}`);
  } catch {
    // Ignorieren — Branch-Cleanup ist best-effort
  }
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function exec(cmd: string, options: { timeout?: number } = {}): string {
  return execSync(cmd, {
    encoding: "utf8",
    timeout: options.timeout ?? 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" }[c] ?? c))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
