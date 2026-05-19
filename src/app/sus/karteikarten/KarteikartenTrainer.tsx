"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { reviewCard } from "@/lib/actions/flashcards";
import type { Rating } from "@/lib/sm2";
import { Eye, RotateCcw, ThumbsDown, Smile, ThumbsUp, Sparkles, Trophy } from "lucide-react";

type CardItem = { id: string; front: string; back: string; hint?: string | null; deckName: string };

const RATING_META: Record<Rating, { label: string; color: string; hint: string; icon: any }> = {
  again: { label: "Nochmal", color: "bg-rose-500 hover:bg-rose-600", hint: "<1 Tag", icon: RotateCcw },
  hard: { label: "Schwer", color: "bg-amber-500 hover:bg-amber-600", hint: "~3 T.", icon: ThumbsDown },
  good: { label: "Gut", color: "bg-emerald-500 hover:bg-emerald-600", hint: "~7 T.", icon: Smile },
  easy: { label: "Einfach", color: "bg-sky-500 hover:bg-sky-600", hint: "~14 T.", icon: ThumbsUp },
};

export function KarteikartenTrainer({ cards }: { cards: CardItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  const current = cards[index];
  const total = cards.length;

  if (!current) {
    return (
      <Card className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h2 className="font-bold mb-1">Stapel geschafft!</h2>
        <p className="text-sm text-slate-500">{doneCount} Karten gelernt. Bis morgen!</p>
        <Button className="mt-4" onClick={() => router.refresh()}>
          <Sparkles className="w-4 h-4" /> Nachladen
        </Button>
      </Card>
    );
  }

  function rate(rating: Rating) {
    start(async () => {
      try {
        const next = await reviewCard({ cardId: current.id, rating });
        setLastInterval(next.interval);
        setDoneCount((c) => c + 1);
        setRevealed(false);
        setIndex((i) => i + 1);
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  const progressPct = total > 0 ? Math.round((index / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Fortschritt */}
      <div>
        <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
          <span>Karte {index + 1} von {total}</span>
          {lastInterval != null && (
            <span className="text-emerald-600">↻ in {lastInterval} {lastInterval === 1 ? "Tag" : "Tagen"} wieder</span>
          )}
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Karte */}
      <Card className="!p-0 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-2 text-xs text-slate-500 flex items-center justify-between">
          <span>📚 {current.deckName}</span>
        </div>
        <div className="p-6 md:p-10 min-h-[200px] flex flex-col items-center justify-center text-center">
          <div className="text-xl md:text-2xl font-medium leading-relaxed whitespace-pre-wrap">{current.front}</div>
          {!revealed && current.hint && (
            <p className="text-xs text-slate-400 mt-3 italic">💡 {current.hint}</p>
          )}
        </div>

        {revealed && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-6 md:p-10 bg-emerald-50/40 dark:bg-emerald-900/10 min-h-[160px] flex items-center justify-center text-center">
            <div className="text-lg md:text-xl whitespace-pre-wrap">{current.back}</div>
          </div>
        )}
      </Card>

      {/* Steuerung */}
      {!revealed ? (
        <Button
          variant="brand"
          onClick={() => setRevealed(true)}
          className="w-full"
          size="lg"
        >
          <Eye className="w-5 h-5" /> Antwort zeigen
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(RATING_META) as Rating[]).map((r) => {
            const m = RATING_META[r];
            const I = m.icon;
            return (
              <button
                key={r}
                type="button"
                disabled={pending}
                onClick={() => rate(r)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg text-white text-xs font-semibold transition disabled:opacity-50 ${m.color}`}
              >
                <I className="w-4 h-4" />
                <span>{m.label}</span>
                <span className="text-[10px] opacity-80 font-normal">{m.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
