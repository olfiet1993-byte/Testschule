"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateFeedbackStatus, deleteFeedback } from "@/lib/actions/feedback";
import {
  Lightbulb, Bug, HelpCircle, MessageSquare, ChevronUp,
  CheckCircle2, Clock, Trash2, Calendar,
} from "lucide-react";

export type AdminFeedbackRow = {
  id: string;
  type: "idea" | "bug" | "question" | "other";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "done" | "wontfix";
  response: string | null;
  votes: number;
  authorName: string;
  authorRole: string;
  createdAt: number;
};

type FbStatus = AdminFeedbackRow["status"];

const TYPE_META = {
  idea: { label: "Idee", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Lightbulb },
  bug: { label: "Bug", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", icon: Bug },
  question: { label: "Frage", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", icon: HelpCircle },
  other: { label: "Sonst.", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: MessageSquare },
} as const;

const STATUS_META: Record<FbStatus, { label: string; color: string }> = {
  open: { label: "offen", color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  planned: { label: "geplant", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  in_progress: { label: "in Arbeit", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  done: { label: "umgesetzt", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  wontfix: { label: "abgelehnt", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

const ROLE_LABEL: Record<string, string> = {
  teacher: "Lehrkraft",
  student: "Schüler:in",
  admin: "Admin",
};

export function AdminFeedbackPanel({ items }: { items: AdminFeedbackRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [statusFilter, setStatusFilter] = useState<"all" | FbStatus>("all");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<FbStatus>("planned");

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (statusFilter !== "all") arr = arr.filter((i) => i.status === statusFilter);
    // Bewertungs-Reihenfolge: offene zuerst (nach Votes), dann aktive, dann erledigte
    const rank: Record<FbStatus, number> = { open: 0, planned: 1, in_progress: 1, done: 2, wontfix: 2 };
    arr.sort((a, b) => {
      const r = rank[a.status] - rank[b.status];
      if (r !== 0) return r;
      const v = b.votes - a.votes;
      if (v !== 0) return v;
      return b.createdAt - a.createdAt;
    });
    return arr;
  }, [items, statusFilter]);

  function setStatus(id: string, status: FbStatus, response?: string) {
    start(async () => {
      try {
        await updateFeedbackStatus({ feedbackId: id, status, response });
        setRespondingTo(null);
        setResponseText("");
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Feedback endgültig löschen?")) return;
    start(async () => {
      try {
        await deleteFeedback(id);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Status-Filter */}
      <div className="flex gap-1 flex-wrap text-xs">
        {(["all", "open", "planned", "in_progress", "done", "wontfix"] as const).map((s) => {
          const active = statusFilter === s;
          const count = s === "all" ? items.length : items.filter((i) => i.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s === "all" ? "Alle" : STATUS_META[s].label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-10">
          <Lightbulb className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Kein Feedback in dieser Ansicht.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const TM = TYPE_META[f.type];
            const SM = STATUS_META[f.status];
            const I = TM.icon;
            return (
              <Card key={f.id} className="!p-4">
                <div className="flex items-start gap-3">
                  {/* Votes */}
                  <div className="flex flex-col items-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 flex-shrink-0">
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-xs font-bold leading-none">{f.votes}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={TM.color}>
                        <I className="w-3 h-3 mr-0.5 inline" /> {TM.label}
                      </Badge>
                      <Badge className={SM.color}>{SM.label}</Badge>
                      <span className="font-semibold">{f.title}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2">{f.body}</p>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{f.authorName}</span>
                      <Badge className="text-[10px]">{ROLE_LABEL[f.authorRole] ?? f.authorRole}</Badge>
                      <span>·</span>
                      <Calendar className="w-3 h-3 inline" />
                      {new Date(f.createdAt).toLocaleDateString("de-DE")}
                    </div>

                    {f.response && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-400">
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Antwort
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{f.response}</p>
                      </div>
                    )}

                    {/* Bewertungs-Aktionen */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {respondingTo === f.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Status:</span>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value as FbStatus)}
                              className="text-xs px-2 py-1 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            >
                              {(Object.keys(STATUS_META) as FbStatus[]).map((s) => (
                                <option key={s} value={s}>{STATUS_META[s].label}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Antwort an die Community (optional)…"
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setStatus(f.id, newStatus, responseText)} disabled={pending}>
                              Speichern
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRespondingTo(null); setResponseText(""); }}>
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1 flex-wrap text-xs items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setRespondingTo(f.id);
                              setResponseText(f.response ?? "");
                              setNewStatus(f.status);
                            }}
                            className="px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 hover:bg-sky-200"
                          >
                            Antworten & Status setzen
                          </button>
                          {f.status !== "planned" && (
                            <button type="button" disabled={pending} onClick={() => setStatus(f.id, "planned")} className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 hover:bg-violet-200">
                              geplant
                            </button>
                          )}
                          {f.status !== "in_progress" && (
                            <button type="button" disabled={pending} onClick={() => setStatus(f.id, "in_progress")} className="px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 hover:bg-sky-200">
                              <Clock className="w-3 h-3 inline" /> in Arbeit
                            </button>
                          )}
                          {f.status !== "done" && (
                            <button type="button" disabled={pending} onClick={() => setStatus(f.id, "done")} className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 hover:bg-emerald-200">
                              <CheckCircle2 className="w-3 h-3 inline" /> umgesetzt
                            </button>
                          )}
                          {f.status !== "wontfix" && (
                            <button type="button" disabled={pending} onClick={() => setStatus(f.id, "wontfix")} className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 hover:bg-rose-200">
                              ablehnen
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(f.id)}
                            className="ml-auto text-slate-400 hover:text-rose-500"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
