/**
 * Token-Logger & DSGVO-Scrubber für alle KI-Aufrufe
 *
 * Platzierung: src/lib/ai/tokenLogger.ts
 *
 * Wird von postClaude() in aiTaskGen.ts aufgerufen — dort nur 3 Zeilen ändern.
 */

import { db } from "@/db";
import { tokenLog } from "@/db/schema";
import { nanoid } from "nanoid";
import crypto from "node:crypto";

// ─── Kosten-Tabelle (Stand Jun 2026, in Micro-EUR) ───────────────────────
// Quelle: anthropic.com/pricing — bei Preisänderung hier updaten
const COST_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 230,   output: 1150  }, // ~$0.25/$1.25 × 0.92 EUR/USD × 1M
  "claude-sonnet-4-6":         { input: 2760,  output: 13800 }, // ~$3/$15
  "claude-opus-4-8":           { input: 13800, output: 69000 }, // ~$15/$75
};

function calcCostMicroEur(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_M_TOKENS[model] ?? { input: 500, output: 2500 };
  return Math.round(
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}

// ─── Token-Log schreiben ──────────────────────────────────────────────────
export interface LogTokenParams {
  teacherId: string;
  callType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  classId?: string | null;
  durationMs?: number;
}

export async function logTokenUsage(params: LogTokenParams): Promise<void> {
  try {
    await db.insert(tokenLog).values({
      id:           nanoid(12),
      teacherId:    params.teacherId,
      callType:     params.callType,
      model:        params.model,
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      costMicroEur: calcCostMicroEur(params.model, params.inputTokens, params.outputTokens),
      classId:      params.classId ?? null,
      durationMs:   params.durationMs ?? null,
    });
  } catch (err) {
    // Logging-Fehler DÜRFEN NIE den Haupt-Request blockieren
    console.error("[token-log] Fehler:", err);
  }
}

// ─── DSGVO Name-Scrubber ──────────────────────────────────────────────────
// Entfernt E-Mails und Klarnamen aus Prompts bevor sie an Claude gehen.
// Wirkt als Sicherheitsnetz — Prompts sollten keine Klarnamen enthalten.

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+49|0049|0)[1-9][0-9\s\-\/]{6,14}[0-9]/g;
// "Frau Schmidt", "Herr Müller", "Patient Weber" etc.
const NAMED_PERSON_RE = /\b(Frau|Herr|Patient(?:in)?|Schüler(?:in)?|SuS|Name:?)\s+([A-ZÄÖÜ][a-zäöüß\-]{2,20}(?:\s+[A-ZÄÖÜ][a-zäöüß\-]{2,20})?)/g;

export function scrubPrompt(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;

  result = result.replace(EMAIL_RE, () => { count++; return "[E-Mail]"; });
  result = result.replace(PHONE_RE, () => { count++; return "[Telefon]"; });
  result = result.replace(NAMED_PERSON_RE, (_, prefix) => { count++; return `${prefix} [Person]`; });

  if (count > 0) {
    console.warn(`[DSGVO-Scrubber] ${count} personenbezogene Element(e) im Prompt ersetzt.`);
  }
  return { text: result, count };
}

// ─── Pseudonymisierung für Vorhersagen ────────────────────────────────────
// Tages-Salt: wird täglich neu generiert, nicht persistent gespeichert.
// Damit sind Langzeit-Verlaufsprofile nicht möglich.
const _salts = new Map<string, string>();

export function getDailySalt(): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!_salts.has(today)) {
    _salts.set(today, crypto.randomBytes(16).toString("hex"));
    // Alte Salts nach 2 Tagen vergessen
    if (_salts.size > 3) _salts.delete([..._salts.keys()].sort()[0]);
  }
  return _salts.get(today)!;
}

export function pseudonymizeId(userId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${getDailySalt()}`)
    .digest("hex")
    .slice(0, 8);
}

// ─── Budget-Check ─────────────────────────────────────────────────────────
export async function getMonthlySpendMicroEur(): Promise<number> {
  // Direktes SQL via Drizzle — summiert laufenden Monat
  const sqlite = (db as any).session?.client ?? (db as any)._client;
  if (!sqlite) return 0;
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const row = sqlite.prepare(
    "SELECT COALESCE(SUM(cost_micro_eur), 0) AS total FROM token_log WHERE created_at >= ?"
  ).get(firstOfMonth.getTime()) as { total: number };
  return row?.total ?? 0;
}
