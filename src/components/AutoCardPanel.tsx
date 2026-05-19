"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles, Check, X, Plus, Layers } from "lucide-react";
import { acceptAutoCards } from "@/lib/actions/flashcards";
import type { Suggestion } from "@/lib/cardSuggester";

/**
 * Klebt unten an Editor-Seiten und schlägt Karteikarten aus dem aktuellen Aufgabenstand vor.
 * Lehrkraft kann einzeln abwählen, alle akzeptieren, alle ablehnen.
 */
export function AutoCardPanel({
  classId,
  topicId,
  taskId,
  deckName,
  suggestions,
}: {
  classId: string;
  topicId?: string | null;
  taskId?: string | null;
  deckName: string;
  suggestions: Suggestion[];
}) {
  const [pending, start] = useTransition();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [accepted, setAccepted] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Wenn neue Vorschläge kommen, Status zurücksetzen
  useEffect(() => {
    setDismissed(new Set());
    setAccepted(null);
  }, [suggestions.length]);

  const visible = useMemo(
    () => suggestions.map((s, i) => ({ ...s, idx: i })).filter((s) => !dismissed.has(s.idx)),
    [suggestions, dismissed],
  );

  if (!classId || suggestions.length === 0) return null;

  async function acceptAll() {
    if (visible.length === 0) return;
    start(async () => {
      try {
        const added = await acceptAutoCards({
          classId,
          topicId: topicId ?? null,
          taskId: taskId ?? null,
          deckName,
          cards: visible.map(({ front, back, hint }) => ({ front, back, hint: hint ?? null })),
        });
        setAccepted(added);
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  if (accepted !== null) {
    return (
      <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:w-96 z-30 animate-fade-in">
        <Card className="!p-4 border-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/30 backdrop-blur shadow-lift">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{accepted} Karteikarten hinzugefügt</div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Stapel „{deckName}" — die Schüler:innen können jetzt damit lernen.
              </p>
            </div>
            <button
              onClick={() => setAccepted(null)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:w-[28rem] z-30 animate-fade-in">
      <Card className="!p-0 border-violet-200 dark:border-violet-900 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-lift overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-violet-50 dark:bg-violet-900/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition text-left"
        >
          <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Auto-Karteikarten</div>
            <div className="text-xs text-slate-500">
              {visible.length} von {suggestions.length} vorgeschlagen — werden mit gespeichert
            </div>
          </div>
          <Layers className="w-4 h-4 text-violet-500" />
        </button>
        {!collapsed && (
          <>
            <ul className="max-h-72 overflow-y-auto p-3 space-y-2">
              {visible.length === 0 ? (
                <li className="text-xs text-slate-400 italic py-2 text-center">
                  Alle Vorschläge ausgeblendet.
                </li>
              ) : (
                visible.map((s) => (
                  <li
                    key={s.idx}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                          {s.front}
                        </div>
                        <div className="text-slate-500 mt-1 line-clamp-2">
                          → {s.back}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDismissed((d) => new Set(d).add(s.idx))}
                        className="text-slate-400 hover:text-rose-500 flex-shrink-0"
                        title="Diese Karte nicht erstellen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <div className="flex gap-2 p-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                onClick={acceptAll}
                disabled={pending || visible.length === 0}
                className="flex-1"
                variant="brand"
              >
                <Plus className="w-3.5 h-3.5" />
                {pending ? "Speichere…" : `${visible.length} Karten anlegen`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(new Set(suggestions.map((_, i) => i)))}
                disabled={pending}
              >
                Alle weg
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
