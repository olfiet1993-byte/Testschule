"use client";

import { useState } from "react";
import {
  Zap, TrendingUp, Bot, CheckCircle2, XCircle, Clock, AlertTriangle, GitBranch, ExternalLink, RefreshCw,
} from "lucide-react";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  monthlyCostEur: number;
  budgetEur: number;
  costByType: { callType: string; callCount: number; costEur: number }[];
  dailyTrend: { date: string; callCount: number; costEur: number }[];
  byModel: { model: string; calls: number; costEur: number }[];
  recentTasks: {
    id: string;
    title: string;
    type: string;
    status: string;
    branchName: string | null;
    prUrl: string | null;
    createdAt: number;
    retries: number;
  }[];
  taskStats: { status: string; count: number }[];
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "gerade eben";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  return `vor ${Math.floor(sec / 86400)} T`;
}

function callTypeLabel(type: string): string {
  const map: Record<string, string> = {
    quiz_generate: "Quiz erstellen",
    task_derive: "Aufgabe ableiten",
    glossary: "Glossar",
    distractors: "Distraktoren",
    explanation: "Erklärung",
    vital: "Vital-Szenario",
    cloze_alt: "Lückentext-Alt.",
    case_options: "Fallstudie",
    curriculum_suggest: "Lehrplan",
    unknown: "Sonstige",
  };
  return map[type] ?? type;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Wartend",      color: "text-slate-500 bg-slate-100 dark:bg-slate-800",           icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress:{ label: "Läuft",        color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",             icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" /> },
  success:    { label: "Erfolgreich",  color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed:     { label: "Fehlgeschl.",  color: "text-red-600 bg-red-50 dark:bg-red-900/30",               icon: <XCircle className="w-3.5 h-3.5" /> },
  escalated:  { label: "Eskaliert",   color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",          icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

// ─── Mini-Balkendiagramm (CSS) ────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 0.001);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{d.label}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {d.value < 0.001 ? "< 0,001 €" : `${d.value.toFixed(3)} €`}
              <span className="ml-1.5 text-slate-400">({d.count}×)</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline (SVG) ─────────────────────────────────────────────────────────

function Sparkline({ data }: { data: { date: string; costEur: number }[] }) {
  if (data.length < 2) {
    return <div className="h-16 flex items-center justify-center text-xs text-slate-400">Noch keine Daten</div>;
  }
  const max = Math.max(...data.map((d) => d.costEur), 0.001);
  const W = 400, H = 60;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.costEur / max) * (H - 8) - 4;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
      <polygon
        points={`0,${H} ${pts.join(" ")} ${W},${H}`}
        fill="#0ea5e9"
        fillOpacity="0.12"
      />
    </svg>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function KIDashboardClient({
  monthlyCostEur, budgetEur, costByType, dailyTrend, byModel, recentTasks, taskStats,
}: Props) {
  const [tab, setTab] = useState<"kosten" | "agenten">("kosten");

  const budgetPct = Math.min(Math.round((monthlyCostEur / budgetEur) * 100), 100);
  const budgetColor = budgetPct >= 80 ? "bg-red-500" : budgetPct >= 60 ? "bg-amber-400" : "bg-emerald-500";

  const taskSummary = Object.fromEntries(taskStats.map((s) => [s.status, s.count]));
  const totalTasks = taskStats.reduce((s, t) => s + t.count, 0);

  const barData = costByType.map((t) => ({
    label: callTypeLabel(t.callType),
    value: t.costEur,
    count: t.callCount,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Zap className="w-6 h-6 text-sky-500" />
          KI & Agenten
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Token-Verbrauch, Kosten und Dev-Agent-Status — DSGVO-konform, keine Klarnamen
        </p>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Budget */}
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">KI-Budget (Monat)</div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {monthlyCostEur.toFixed(2)} €
              </div>
              <div className="text-xs text-slate-400">von {budgetEur} € Limit</div>
            </div>
            <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
              budgetPct >= 80 ? "bg-red-50 text-red-600" : budgetPct >= 60 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              {budgetPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${budgetColor}`} style={{ width: `${budgetPct}%` }} />
          </div>
        </div>

        {/* Agent-Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Agent-Tasks gesamt</div>
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalTasks}</div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {taskSummary.success > 0 && <span className="text-xs text-emerald-600 font-medium">✅ {taskSummary.success} ok</span>}
            {taskSummary.failed > 0 && <span className="text-xs text-red-500 font-medium">❌ {taskSummary.failed} fail</span>}
            {taskSummary.escalated > 0 && <span className="text-xs text-amber-500 font-medium">⚠ {taskSummary.escalated} eskal.</span>}
          </div>
        </div>

        {/* Modell-Mix */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">Modell-Mix (Monat)</div>
          {byModel.length === 0 ? (
            <div className="text-xs text-slate-400">Noch keine Daten</div>
          ) : byModel.map((m) => (
            <div key={m.model} className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                {m.model.includes("haiku") ? "Haiku" : m.model.includes("sonnet") ? "Sonnet" : "Opus"}
              </span>
              <span className="text-slate-400">{m.calls}× · {m.costEur.toFixed(3)} €</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["kosten", "agenten"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t === "kosten" ? "💰 Token-Kosten" : "🤖 Agent-Tasks"}
          </button>
        ))}
      </div>

      {/* Tab: Kosten */}
      {tab === "kosten" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Trend */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Tägliche Kosten (30 Tage)</span>
            </div>
            <Sparkline data={dailyTrend} />
            {dailyTrend.length > 0 && (
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{dailyTrend[0]?.date}</span>
                <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
              </div>
            )}
          </div>

          {/* Kosten nach Typ */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-sky-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Kosten nach KI-Aufruf (Monat)</span>
            </div>
            {barData.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">Noch keine KI-Aufrufe diesen Monat</div>
            ) : (
              <BarChart data={barData} />
            )}
          </div>
        </div>
      )}

      {/* Tab: Agent-Tasks */}
      {tab === "agenten" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <Bot className="w-4 h-4 text-sky-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Letzte 20 Agent-Tasks</span>
          </div>
          {recentTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Noch keine Tasks — starte den Orchestrator mit:<br />
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-2 inline-block">
                npx tsx src/lib/agent/orchestrator.ts
              </code>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Titel</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Typ</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Branch / PR</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Zeit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTasks.map((task) => {
                  const s = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                        {task.title}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          {task.type}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                          {s.icon}{s.label}
                          {task.retries > 0 && <span className="ml-1 opacity-70">({task.retries}×)</span>}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {task.prUrl ? (
                          <a href={task.prUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline">
                            <ExternalLink className="w-3 h-3" /> PR
                          </a>
                        ) : task.branchName ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <GitBranch className="w-3 h-3" /> {task.branchName.slice(0, 30)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-400">
                        {timeAgo(task.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
