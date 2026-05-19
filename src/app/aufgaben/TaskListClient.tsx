"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Badge } from "@/components/ui/Input";
import { deleteTask, togglePublishTask, setTaskDueDate, revealTaskAnswers, hideTaskAnswers, duplicateTask } from "@/lib/actions/tasks";
import { startLiveSession } from "@/lib/actions/live";
import {
  ClipboardList, CheckCircle2, Clock, Pencil, Trash2, Eye, EyeOff, Radio, Calendar, X, GraduationCap, Lock, Unlock, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DIFFICULTY_LABEL } from "@/components/DifficultySelect";

const typeLabels: Record<string, string> = {
  quiz: "Quiz",
  flashcards: "Karteikarten",
  image_hotspot: "Bilderrätsel",
  cloze: "Lückentext",
  case_study: "Fallstudie",
};

export function TaskListClient({
  tasks,
  classMap,
  subMap,
}: {
  tasks: any[];
  classMap: Record<string, any>;
  subMap: Record<string, number>;
}) {
  const [pending, start] = useTransition();
  const [dueEditing, setDueEditing] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<any | null>(null);
  const router = useRouter();

  function formatDue(iso: string | null): { text: string; urgency: "past" | "today" | "soon" | "later" } | null {
    if (!iso) return null;
    const due = new Date(iso);
    const now = new Date();
    const dayMs = 1000 * 60 * 60 * 24;
    const diff = Math.floor((due.getTime() - now.getTime()) / dayMs);
    const text = due.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
    if (diff < 0) return { text: `überfällig (${text})`, urgency: "past" };
    if (diff === 0) return { text: `heute (${text})`, urgency: "today" };
    if (diff <= 3) return { text: `in ${diff}T (${text})`, urgency: "soon" };
    return { text, urgency: "later" };
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => {
        const klass = classMap[t.classId];
        const published = !!t.publishedAt;
        const dueInfo = formatDue(t.dueAt ?? null);
        const dueColors = {
          past: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
          today: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
          soon: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
          later: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        };
        return (
          <Card key={t.id} className="!py-4 hover:shadow-md transition">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: (klass?.color ?? "#888") + "33", color: klass?.color ?? "#888" }}
              >
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold break-words">{t.title}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                  <Badge>{typeLabels[t.type] ?? t.type}</Badge>
                  {t.difficulty && DIFFICULTY_LABEL[t.difficulty] && (
                    <Badge className={DIFFICULTY_LABEL[t.difficulty].color}>
                      {DIFFICULTY_LABEL[t.difficulty].label}
                    </Badge>
                  )}
                  {t.examMode && (
                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                      <GraduationCap className="w-3 h-3 inline mr-1" /> Klausur
                      {t.timeLimitMinutes && <> ({t.timeLimitMinutes} min)</>}
                    </Badge>
                  )}
                  <span>{klass?.name ?? "—"}</span>
                  <span>•</span>
                  <span>{t.xpReward} XP</span>
                  <span>•</span>
                  <span>{subMap[t.id] ?? 0} Abgaben</span>
                  {dueInfo && (
                    <Badge className={dueColors[dueInfo.urgency]}>
                      <Calendar className="w-3 h-3 inline mr-1" /> {dueInfo.text}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {dueEditing === t.id && (
              <div className="mt-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg flex items-center gap-2 flex-wrap">
                <label className="text-xs font-medium">Frist setzen:</label>
                <input
                  type="date"
                  defaultValue={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      start(async () => {
                        await setTaskDueDate(t.id, new Date(val + "T23:59:59").toISOString());
                        setDueEditing(null);
                      });
                    }
                  }}
                  className="h-8 px-2 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                />
                {t.dueAt && (
                  <button
                    onClick={() => start(async () => { await setTaskDueDate(t.id, null); setDueEditing(null); })}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Frist entfernen
                  </button>
                )}
                <button onClick={() => setDueEditing(null)} className="text-slate-400 hover:text-slate-600 ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {published ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" /> veröffentlicht
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Clock className="w-3 h-3 inline mr-1" /> Entwurf
                </Badge>
              )}
              <div className="flex items-center gap-1">

                {t.type === "quiz" && (
                  <button
                    onClick={() => start(() => { startLiveSession(t.id); })}
                    disabled={pending}
                    title="Live-Quiz starten"
                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}

                {t.examMode && (
                  <button
                    onClick={() => start(async () => {
                      if (t.answersRevealedAt) {
                        await hideTaskAnswers(t.id);
                      } else {
                        if (confirm("Auflösung für alle Schüler:innen freigeben?")) {
                          await revealTaskAnswers(t.id);
                        }
                      }
                    })}
                    disabled={pending}
                    title={t.answersRevealedAt ? "Auflösung verbergen" : "Auflösung freigeben"}
                    className={`w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${t.answersRevealedAt ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {t.answersRevealedAt ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}

                <button
                  onClick={() => setDueEditing(dueEditing === t.id ? null : t.id)}
                  title="Frist setzen"
                  className={`w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${dueInfo ? "text-sky-600" : "text-slate-500"}`}
                >
                  <Calendar className="w-4 h-4" />
                </button>

                <button
                  onClick={() => start(() => { togglePublishTask(t.id); })}
                  disabled={pending}
                  title={published ? "Veröffentlichung zurücknehmen" : "Veröffentlichen"}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  {published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <Link
                  href={`/aufgaben/${t.id}/bearbeiten`}
                  title="Bearbeiten"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <Pencil className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => setDuplicating(t)}
                  disabled={pending}
                  title="Duplizieren"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const subs = subMap[t.id] ?? 0;
                    const msg = subs > 0
                      ? `Aufgabe "${t.title}" wirklich löschen?\n${subs} Abgaben gehen verloren.`
                      : `Aufgabe "${t.title}" wirklich löschen?`;
                    if (confirm(msg)) start(() => { deleteTask(t.id); });
                  }}
                  disabled={pending}
                  title="Löschen"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      {duplicating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Aufgabe duplizieren</h3>
            <p className="text-sm text-slate-500 mb-4">
              „{duplicating.title}" als neuer Entwurf — wähle die Ziel-Klasse:
            </p>
            <div className="space-y-2 mb-4">
              {Object.values(classMap).map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => {
                    const target = c.id;
                    const id = duplicating.id;
                    setDuplicating(null);
                    start(async () => {
                      try {
                        await duplicateTask({ taskId: id, targetClassId: target });
                      } catch (e: any) { alert(e.message); }
                    });
                  }}
                  className="w-full text-left p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 transition flex items-center gap-3"
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.id === duplicating.classId && <div className="text-xs text-slate-500">(aktuelle Klasse)</div>}
                  </div>
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setDuplicating(null)} className="w-full">
              Abbrechen
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
