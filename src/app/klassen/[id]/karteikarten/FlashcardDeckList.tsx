"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { deleteCard } from "@/lib/actions/flashcards";
import { Layers, ChevronDown, ChevronRight, Trash2, ExternalLink, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

type Deck = {
  id: string;
  name: string;
  description?: string | null;
  source: "manual" | "auto_task" | "auto_content";
  sourceTaskId?: string | null;
  sourceTaskTitle?: string | null;
  cardCount: number;
  learnerCount: number;
  reviewCount: number;
  avgEase: number | null;
  createdAt: number | string;
};
type CardItem = { id: string; deckId: string; front: string; back: string; hint?: string | null };

const SOURCE_META: Record<Deck["source"], { label: string; color: string; icon: any }> = {
  manual: { label: "manuell", color: "bg-slate-100 text-slate-700 dark:bg-slate-800", icon: Layers },
  auto_task: { label: "Auto · Aufgabe", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: Sparkles },
  auto_content: { label: "Auto · Inhalt", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: BookOpen },
};

export function FlashcardDeckList({
  classId,
  className,
  decks,
  cards,
  memberCount,
}: {
  classId: string;
  className: string;
  decks: Deck[];
  cards: CardItem[];
  memberCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(deckId: string) {
    setExpanded((s) => {
      const next = new Set(s);
      next.has(deckId) ? next.delete(deckId) : next.add(deckId);
      return next;
    });
  }

  async function removeCard(cardId: string) {
    if (!confirm("Karte löschen?")) return;
    start(async () => {
      try {
        await deleteCard(cardId);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  const totalCards = decks.reduce((a, d) => a + d.cardCount, 0);
  const totalLearners = new Set(decks.flatMap((d) => d.learnerCount > 0 ? [d.id] : [])).size;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Layers className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Karteikarten — {className}</h1>
          <p className="text-sm text-slate-500">
            Alle Stapel deiner Klasse · {decks.length} Stapel · {totalCards} Karten · {memberCount} Lernende
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-violet-600">{decks.length}</div>
          <div className="text-xs text-slate-500 mt-1">Stapel</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-sky-600">{totalCards}</div>
          <div className="text-xs text-slate-500 mt-1">Karten gesamt</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">
            {decks.reduce((a, d) => a + d.reviewCount, 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Wiederholungen</div>
        </Card>
      </div>

      {decks.length === 0 ? (
        <Card className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Stapel.</p>
          <p className="text-xs text-slate-400 mt-1">
            Stapel entstehen automatisch, sobald du eine Aufgabe schreibst und die Auto-Karteikarten unten akzeptierst.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {decks.map((d) => {
            const open = expanded.has(d.id);
            const M = SOURCE_META[d.source];
            const I = M.icon;
            const dCards = cards.filter((c) => c.deckId === d.id);
            return (
              <Card key={d.id} className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(d.id)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-start gap-3"
                >
                  {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{d.name}</h3>
                      <Badge className={M.color}>
                        <I className="w-3 h-3" /> {M.label}
                      </Badge>
                    </div>
                    {d.description && <p className="text-xs text-slate-500 mb-1">{d.description}</p>}
                    <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>{d.cardCount} Karten</span>
                      <span>·</span>
                      <span>{d.learnerCount} Lernende</span>
                      <span>·</span>
                      <span>{d.reviewCount} Wiederholungen</span>
                      {d.avgEase != null && (
                        <>
                          <span>·</span>
                          <span title="Durchschnittlicher Ease-Faktor (SM-2)">Ø Ease {d.avgEase}</span>
                        </>
                      )}
                      {d.sourceTaskTitle && (
                        <Link
                          href={`/aufgaben/${d.sourceTaskId}/bearbeiten`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Aus „{d.sourceTaskTitle.slice(0, 32)}{d.sourceTaskTitle.length > 32 ? "…" : ""}"
                        </Link>
                      )}
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                    {dCards.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Stapel ist leer.</p>
                    ) : (
                      <ul className="space-y-2">
                        {dCards.map((c) => (
                          <li
                            key={c.id}
                            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                          >
                            <div className="font-medium">{c.front}</div>
                            <div className="text-slate-600 dark:text-slate-300">→ {c.back}</div>
                            <button
                              type="button"
                              onClick={() => removeCard(c.id)}
                              disabled={pending}
                              className="text-slate-400 hover:text-rose-500 flex-shrink-0 self-center"
                              title="Karte löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
