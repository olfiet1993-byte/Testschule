"use client";

/**
 * AiReviewModal
 *
 * Erscheint wenn eine KI-generierte Aufgabe veröffentlicht werden soll
 * aber noch nicht von der Lehrkraft freigegeben wurde.
 *
 * Die Lehrkraft sieht eine Zusammenfassung des Inhalts und muss aktiv
 * bestätigen, bevor die Aufgabe sichtbar gemacht werden kann.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewTask } from "@/lib/actions/tasks";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Sparkles, ShieldCheck, X, AlertTriangle,
  CheckCircle2, ChevronRight, Eye,
} from "lucide-react";

// ─── Payload-Renderer (kompakte Vorschau je Aufgabentyp) ────────────────────

function PayloadPreview({ type, payload }: { type: string; payload: any }) {
  if (!payload) return null;

  if (type === "quiz" && Array.isArray(payload.questions)) {
    return (
      <div className="space-y-3">
        {payload.questions.map((q: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
            <p className="font-medium mb-1">
              <span className="text-slate-400 mr-1">{i + 1}.</span>
              {q.question}
            </p>
            <ul className="space-y-0.5 pl-4">
              {(q.options ?? []).map((opt: string, oi: number) => (
                <li key={oi} className={`text-xs ${oi === q.correctIndex ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  {oi === q.correctIndex ? "✓" : "·"} {opt}
                </li>
              ))}
            </ul>
            {q.explanation && (
              <p className="mt-1 text-xs text-slate-400 italic">💡 {q.explanation}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (type === "flashcards" && Array.isArray(payload.cards)) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {payload.cards.map((c: any, i: number) => (
          <div key={i} className="flex gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
            <span className="font-medium min-w-[40%]">{c.front}</span>
            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0 mt-0.5" />
            <span className="text-slate-600 dark:text-slate-300">{c.back}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "cloze" && payload.text) {
    return (
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm whitespace-pre-wrap leading-relaxed">
        {payload.text}
      </div>
    );
  }

  if (type === "case_study" && payload.intro) {
    return (
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
          <p className="font-medium text-xs text-slate-500 mb-1">Fallbeschreibung</p>
          <p>{payload.intro}</p>
        </div>
        {Array.isArray(payload.steps) && payload.steps.map((s: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
            <p className="font-medium text-xs text-slate-500 mb-1">Schritt {i + 1}</p>
            <p>{s.question}</p>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: Raw JSON
  return (
    <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-auto max-h-40">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function AiReviewModal({
  taskId,
  taskTitle,
  taskType,
  payload,
  onClose,
  onApproved,
}: {
  taskId: string;
  taskTitle: string;
  taskType: string;
  payload: any;
  onClose: () => void;
  /** Wird aufgerufen nachdem reviewTask() erfolgreich war — danach kann der Caller publish() auslösen */
  onApproved: () => void;
}) {
  const [step, setStep] = useState<"review" | "confirming">("review");
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function approve() {
    if (!checked) return;
    start(async () => {
      try {
        await reviewTask(taskId);
        router.refresh();
        onApproved();
      } catch (e: any) {
        setError(e.message ?? "Fehler beim Freigeben");
      }
    });
  }

  const parsedPayload = (() => {
    if (typeof payload === "string") {
      try { return JSON.parse(payload); } catch { return null; }
    }
    return payload;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl !p-0 shadow-lift my-6">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">KI-Inhalte prüfen vor Veröffentlichung</h2>
            <p className="text-xs text-slate-500 truncate">{taskTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hinweis-Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Dieser Inhalt wurde von Claude generiert. KI kann Fehler machen — prüfe alle Fragen, Antworten und Erklärungen sorgfältig, bevor du freigibst.
          </p>
        </div>

        {/* Inhalt */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Generierter Inhalt:</span>
          </div>
          <PayloadPreview type={taskType} payload={parsedPayload} />
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
              Ich habe alle Fragen, Antworten und Erklärungen geprüft. Der Inhalt ist fachlich korrekt und für die Schüler:innen geeignet.
            </span>
          </label>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={approve}
              disabled={!checked || pending}
              className="flex-1"
            >
              {pending ? (
                "Freigabe läuft…"
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Geprüft — Freigeben & Veröffentlichen
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Abbrechen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
