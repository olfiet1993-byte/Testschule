"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Badge, Input } from "@/components/ui/Input";
import { History, Search } from "lucide-react";

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  "task.create": { label: "Aufgabe erstellt", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  "task.publish": { label: "veröffentlicht", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "task.unpublish": { label: "zurückgenommen", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  "task.delete": { label: "Aufgabe gelöscht", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  "class.create": { label: "Klasse erstellt", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  "class.delete": { label: "Klasse gelöscht / übergeben", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  "member.add": { label: "Schüler hinzugefügt", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "member.remove": { label: "Schüler entfernt", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  "invite.send": { label: "Einladung gesendet", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  "invite.accept": { label: "Einladung angenommen", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  "invite.revoke": { label: "Einladung zurückgezogen", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  "backup.run": { label: "Backup", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
};

function relativeTime(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "gerade eben";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  if (sec < 86400 * 7) return `vor ${Math.floor(sec / 86400)} T`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function AuditFilterClient({
  entries,
  totalShown,
  actors,
  initialFilter,
}: {
  entries: any[];
  totalShown: number;
  actors: string[];
  initialFilter: { action: string; actor: string; days: number; q: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(initialFilter.q);

  function update(patch: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v); else sp.delete(k);
    }
    start(() => router.push("/audit?" + sp.toString()));
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <History className="w-6 h-6 text-slate-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Aktivitäts-Protokoll</h1>
          <p className="text-sm text-slate-500">{totalShown} Einträge (gefiltert)</p>
        </div>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Suchen (Akteur, Aktion, Beschreibung)…"
              className="pl-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") update({ q }); }}
              onBlur={() => update({ q })}
            />
          </div>
          <select
            value={initialFilter.action}
            onChange={(e) => update({ action: e.target.value })}
            className="h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
          >
            <option value="">Alle Aktionen</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={initialFilter.actor}
            onChange={(e) => update({ actor: e.target.value })}
            className="h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
          >
            <option value="">Alle Akteure</option>
            {actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-3">
          {[7, 30, 90, 365, 0].map((d) => (
            <button
              key={d}
              onClick={() => update({ days: d > 0 ? String(d) : "0" })}
              className={`text-xs px-3 py-1 rounded-full ${
                initialFilter.days === d
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d === 0 ? "Alle" : `${d} Tage`}
            </button>
          ))}
        </div>
      </Card>

      {entries.length === 0 ? (
        <Card className="text-center py-10">
          <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Keine Einträge für diese Filter.</p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {entries.map((e) => {
              const meta = ACTION_LABEL[e.action] ?? { label: e.action, color: "bg-slate-100 text-slate-700" };
              return (
                <li key={e.id} className="p-3 flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={meta.color}>{meta.label}</Badge>
                      <span className="text-sm font-medium">{e.actorName}</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{e.summary}</div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    {relativeTime(new Date(e.createdAt))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
