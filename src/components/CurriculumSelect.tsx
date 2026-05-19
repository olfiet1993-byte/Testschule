"use client";

import { useState } from "react";
import { Label } from "@/components/ui/Input";
import { BookMarked, Sparkles } from "lucide-react";
import { suggestCurriculumUnit } from "@/lib/actions/aiTaskGen";

export type CurriculumUnit = {
  id: string;
  parentId?: string | null;
  code?: string | null;
  title: string;
  schoolId?: string | null;
};

/**
 * Curriculum-Picker mit Gruppierung nach Top-Level-Kompetenzbereich.
 */
export function CurriculumSelect({
  units,
  value,
  onChange,
  label = "Lehrplan-Zuordnung (optional)",
  taskTitle,
  taskDescription,
}: {
  units: CurriculumUnit[];
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  taskTitle?: string;
  taskDescription?: string;
}) {
  const [aiPending, setAiPending] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);

  async function suggest() {
    if (!taskTitle?.trim()) return alert("Erst einen Aufgaben-Titel eintragen");
    setAiPending(true);
    setAiReason(null);
    try {
      const { unitId, reason } = await suggestCurriculumUnit({
        title: taskTitle,
        description: taskDescription,
        units: units.filter((u) => u.code).map((u) => ({ id: u.id, code: u.code, title: u.title })),
      });
      if (unitId && units.some((u) => u.id === unitId)) {
        onChange(unitId);
        setAiReason(reason);
      } else {
        setAiReason("Kein eindeutiger Vorschlag — bitte manuell zuordnen.");
      }
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    } finally {
      setAiPending(false);
    }
  }
  // Top-Level (kein parent) + Kinder gruppieren
  const tops = units.filter((u) => !u.parentId).sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  const childrenByParent: Record<string, CurriculumUnit[]> = {};
  for (const u of units) {
    if (u.parentId) {
      if (!childrenByParent[u.parentId]) childrenByParent[u.parentId] = [];
      childrenByParent[u.parentId].push(u);
    }
  }
  for (const arr of Object.values(childrenByParent)) {
    arr.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label htmlFor="curriculum" className="inline-flex items-center gap-1">
          <BookMarked className="w-3.5 h-3.5 text-violet-500" /> {label}
        </Label>
        {taskTitle !== undefined && (
          <button
            type="button"
            onClick={suggest}
            disabled={aiPending}
            className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 disabled:opacity-50 transition"
            title="KI schlägt passende Lehrplan-Einheit vor"
          >
            <Sparkles className="w-3 h-3" />
            {aiPending ? "Denke…" : "KI-Vorschlag"}
          </button>
        )}
      </div>
      <select
        id="curriculum"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
      >
        <option value="">— nicht zugeordnet —</option>
        {tops.map((top) => (
          <optgroup key={top.id} label={`${top.code ? top.code + " · " : ""}${top.title}`}>
            <option value={top.id}>
              {top.code ? top.code + " · " : ""}{top.title} (Übergreifend)
            </option>
            {(childrenByParent[top.id] ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {"  "}{c.code ? c.code + " · " : ""}{c.title}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {aiReason && (
        <p className="text-xs text-violet-600 dark:text-violet-300 mt-1 flex items-start gap-1">
          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{aiReason}</span>
        </p>
      )}
    </div>
  );
}

export function ShareToggle({
  shared,
  onChange,
  label = "Im Schul-Austausch teilen",
}: {
  shared: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={shared}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300"
      />
      <span>{label}</span>
      <span className="text-xs text-slate-500">— andere Lehrkräfte deiner Schule sehen + kopieren</span>
    </label>
  );
}
