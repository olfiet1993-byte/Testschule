"use client";

import { useState, useMemo, useTransition } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitFlashcards } from "@/lib/actions/tasks";
import { Confetti } from "@/components/Confetti";
import { ExamGate, ExamTimer } from "@/components/ExamGate";
import { Check, X, Trophy, ArrowLeft, Star, RotateCw, Brain, Layers } from "lucide-react";
import Link from "next/link";

type CardItem = { front: string; back: string };

export function FlashcardSolver({ task, prevSubmission }: { task: any; prevSubmission: any }) {
  const payload = JSON.parse(task.payload) as { cards: CardItem[] };

  // Vorher bekannte Karten-Indices aus letzter Submission
  const prevKnown = useMemo<number[]>(() => {
    if (!prevSubmission?.answer) return [];
    try {
      const parsed = JSON.parse(prevSubmission.answer);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [prevSubmission]);

  // Karten, die der Schüler noch nicht kann (Index-Liste)
  const unknownIndices = useMemo(
    () => payload.cards.map((_, i) => i).filter((i) => !prevKnown.includes(i)),
    [payload, prevKnown]
  );

  const canDrill = prevKnown.length > 0 && unknownIndices.length > 0 && unknownIndices.length < payload.cards.length;
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const [mode, setMode] = useState<null | "all" | "drill">(null);
  const [pending, start] = useTransition();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<number[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number; scorePct: number; xpEarned: number } | null>(null);

  // Karten-Liste fürs Durchspielen (im Drill nur die unbekannten)
  const playIndices = mode === "drill" ? unknownIndices : payload.cards.map((_, i) => i);
  const card = mode ? payload.cards[playIndices[idx]] : null;
  const last = mode ? idx === playIndices.length - 1 : false;
  const progress = mode ? ((idx + 1) / playIndices.length) * 100 : 0;

  // Klausur-Gate
  if (task.examMode && !examStartedAt) {
    return (
      <ExamGate
        task={task}
        prevSubmission={prevSubmission}
        onStart={() => { setExamStartedAt(Date.now()); setMode("all"); }}
      />
    );
  }

  // Pre-Screen: Modus-Auswahl wenn Drill möglich
  if (!mode) {
    if (!canDrill) {
      // Direkt im All-Modus starten
      setTimeout(() => setMode("all"), 0);
      return null;
    }
    return (
      <div className="max-w-xl mx-auto">
        <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold mb-1">{task.title}</h1>
        <p className="text-sm text-slate-500 mb-6">
          Letzte Runde: {prevKnown.length} / {payload.cards.length} Karten gewusst ({prevSubmission.scorePct.toFixed(0)}%).
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode("drill")}
            className="w-full p-4 text-left rounded-xl border-2 border-violet-500 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">Nur schwierige Karten</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {unknownIndices.length} Karten, die du beim letzten Mal nicht wusstest
                </div>
              </div>
            </div>
            <p className="text-xs text-violet-700 dark:text-violet-300">
              💡 Spaced-Repetition — fokussierter Lernen, weniger Wiederholung
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("all")}
            className="w-full p-4 text-left rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">Alle Karten</div>
                <div className="text-xs text-slate-500">
                  {payload.cards.length} Karten — alles wiederholen
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  function rate(knew: boolean) {
    const cardIdx = playIndices[idx];
    let next = known;
    if (knew && !known.includes(cardIdx)) next = [...known, cardIdx];
    if (last) {
      start(async () => {
        const r = await submitFlashcards(task.id, next, mode === "drill" ? "drill" : "all");
        setResult(r);
      });
    } else {
      setKnown(next);
      setIdx(idx + 1);
      setFlipped(false);
    }
  }

  if (result) {
    const perfect = result.scorePct === 100;
    return (
      <>
        <Confetti trigger={perfect} />
        <Card className={`text-center py-12 ${perfect ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white" : ""}`}>
          <Trophy className={`w-20 h-20 mx-auto mb-4 ${perfect ? "text-white" : "text-amber-500"}`} />
          <h2 className="text-3xl font-bold mb-2">
            {perfect ? "Alles gewusst! 🎉" : "Geschafft!"}
          </h2>
          <p className={`text-lg mb-6 ${perfect ? "text-white/90" : "text-slate-500"}`}>
            Du wusstest {result.correct} von {result.total} Karten
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${perfect ? "bg-white/20" : "bg-amber-100"}`}>
            <Star className={perfect ? "text-white" : "text-amber-600"} />
            <span className={`font-bold ${perfect ? "text-white" : "text-amber-700"}`}>+{result.xpEarned} XP</span>
          </div>
          <div className="flex gap-2 justify-center mt-8">
            <Link href="/sus/aufgaben">
              <Button variant={perfect ? "secondary" : "primary"}>Zurück zu Aufgaben</Button>
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <div>
      {task.examMode && task.timeLimitMinutes && examStartedAt && (
        <ExamTimer
          startedAt={examStartedAt}
          limitMinutes={task.timeLimitMinutes}
          onTimeout={() => {
            // Auto-Submit mit aktuellem Stand
            start(async () => {
              const r = await submitFlashcards(task.id, known, "all");
              setResult(r);
            });
          }}
        />
      )}
      <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="text-2xl font-bold mb-1">{task.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        Karte {idx + 1} von {playIndices.length}
        {mode === "drill" && (
          <span className="ml-2 text-violet-600">
            <Brain className="w-3 h-3 inline" /> Schwierige
          </span>
        )}
      </p>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
        <div className="bg-violet-500 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div
        className="cursor-pointer mb-6"
        onClick={() => setFlipped((f) => !f)}
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "",
            minHeight: 280,
          }}
        >
          <div
            className="absolute inset-0 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-xs uppercase tracking-wider mb-3 opacity-70">Vorderseite</div>
            <div className="text-2xl font-semibold">{card?.front}</div>
            <div className="mt-6 text-xs opacity-70 flex items-center gap-1">
              <RotateCw className="w-3 h-3" /> Tippen zum Umdrehen
            </div>
          </div>
          <div
            className="absolute inset-0 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800 border-2 border-violet-500 shadow-lg"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-xs uppercase tracking-wider mb-3 text-violet-600">Rückseite</div>
            <div className="text-lg">{card?.back}</div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 transition-opacity ${flipped ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
        <Button variant="danger" onClick={() => rate(false)} disabled={pending} size="lg">
          <X className="w-5 h-5" /> Wusste ich nicht
        </Button>
        <Button onClick={() => rate(true)} disabled={pending} size="lg" className="bg-emerald-600 hover:bg-emerald-500">
          <Check className="w-5 h-5" /> Kannte ich
        </Button>
      </div>
      {!flipped && (
        <p className="text-center text-xs text-slate-500 mt-3">Erst Karte umdrehen, dann selbst bewerten.</p>
      )}
    </div>
  );
}
