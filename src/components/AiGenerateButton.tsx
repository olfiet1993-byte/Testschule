"use client";

import { useState, useTransition } from "react";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles, X, Wand2 } from "lucide-react";
import { generateTaskWithAI } from "@/lib/actions/aiTaskGen";

type Difficulty = "leicht" | "mittel" | "schwer";
type Type = "quiz" | "cloze" | "flashcards" | "case_study";

export function AiGenerateButton({
  type,
  defaultTopic,
  onResult,
}: {
  type: Type;
  defaultTopic?: string;
  onResult: (result: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [topic, setTopic] = useState(defaultTopic ?? "");
  const [count, setCount] = useState(5);
  const [diff, setDiff] = useState<Difficulty>("mittel");
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (!topic.trim()) return setError("Thema eintippen");
    setError(null);
    start(async () => {
      try {
        const result = await generateTaskWithAI({ type, topic, count, difficulty: diff });
        onResult(result);
        setOpen(false);
      } catch (e: any) {
        setError(e.message ?? "Unbekannter Fehler");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="brand" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="w-4 h-4" /> Mit KI generieren
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md !p-5 shadow-lift">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold">KI-Generator — {type}</h3>
              <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Beschreib das Thema, wähle Anzahl & Schwierigkeit — Claude erstellt einen Entwurf, den du dann selbst feinschleifst.
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="ai-topic">Thema</Label>
                <Input
                  id="ai-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="z. B. Anatomie des Herzens oder Diabetes Typ 1 — Notfallmanagement"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {type !== "case_study" && (
                  <div>
                    <Label htmlFor="ai-count">Anzahl</Label>
                    <Input
                      id="ai-count"
                      type="number"
                      min={1}
                      max={10}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                )}
                <div className={type === "case_study" ? "col-span-2" : ""}>
                  <Label htmlFor="ai-diff">Schwierigkeit</Label>
                  <select
                    id="ai-diff"
                    value={diff}
                    onChange={(e) => setDiff(e.target.value as Difficulty)}
                    className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                  >
                    <option value="leicht">🟢 leicht</option>
                    <option value="mittel">🟡 mittel</option>
                    <option value="schwer">🔴 schwer</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={run} disabled={pending} variant="brand" className="flex-1">
                  {pending ? "Claude denkt…" : <><Sparkles className="w-4 h-4" /> Generieren</>}
                </Button>
                <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                  Abbrechen
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                Powered by Claude Haiku 4.5 · benötigt ANTHROPIC_API_KEY in .env.local
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
