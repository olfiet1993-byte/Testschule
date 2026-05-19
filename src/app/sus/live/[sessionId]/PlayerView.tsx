"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Trophy, Clock, Check, X, Hourglass, Users } from "lucide-react";
import Link from "next/link";

type Participant = { userId: string; displayName: string; score: number; xpEarned?: number };
type Question = {
  index: number;
  total: number;
  question: string | null;
  options: string[];
  correctIndex: number | null;
  explanation: string | null;
  startedAt: number | null;
  endsAt: number | null;
  answersCount: number;
};
type State = {
  id: string;
  code: string;
  className: string;
  taskTitle: string;
  state: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
  currentQuestion: Question | null;
  participants: Participant[];
  questionDurationMs: number;
};

const OPTION_COLORS = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-pink-500"];

export function PlayerView({
  initialState,
  sessionId,
  myUserId,
}: {
  initialState: State;
  sessionId: string;
  myUserId: string;
}) {
  const [state, setState] = useState<State>(initialState);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedForQ, setSelectedForQ] = useState<number | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/live/${sessionId}/stream`);
    es.onmessage = (e) => {
      try { setState(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // Reset selection beim Fragenwechsel
  useEffect(() => {
    const idx = state.currentQuestion?.index ?? null;
    if (idx !== selectedForQ) {
      setSelected(null);
      setSelectedForQ(idx);
    }
  }, [state.currentQuestion?.index, selectedForQ]);

  async function answer(optionIdx: number) {
    if (selected != null) return;
    setSelected(optionIdx);
    await fetch(`/api/live/${sessionId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", optionIdx }),
    });
  }

  const me = state.participants.find((p) => p.userId === myUserId);
  const myRank = state.participants.findIndex((p) => p.userId === myUserId) + 1;

  if (state.state === "ended") {
    return (
      <div className="text-center max-w-md mx-auto">
        <Trophy className="w-20 h-20 mx-auto text-amber-500 mb-3" />
        <h1 className="text-3xl font-bold mb-1">Quiz beendet!</h1>
        <p className="text-slate-500 mb-6">{state.taskTitle}</p>

        {me && (
          <Card className={`mb-4 ${myRank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0" : ""}`}>
            <div className="text-sm uppercase tracking-wider opacity-80 mb-1">Dein Endergebnis</div>
            <div className="text-5xl font-bold">{me.score}</div>
            <div className="text-sm mt-2 opacity-80">Punkte · Platz {myRank} von {state.participants.length}</div>
          </Card>
        )}

        {me?.xpEarned != null && me.xpEarned > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-emerald-500 to-sky-500 text-white border-0">
            <div className="text-sm uppercase tracking-wider opacity-80 mb-1">Für deinen Lernfortschritt</div>
            <div className="text-3xl font-bold">+{me.xpEarned} XP</div>
            <div className="text-xs mt-1 opacity-80">in deinem Profil gutgeschrieben</div>
          </Card>
        )}
        {me?.xpEarned === 0 && (
          <Card className="mb-6 text-sm text-slate-500">
            Resultate gespeichert. Du hattest schon eine bessere Abgabe — keine zusätzlichen XP.
          </Card>
        )}

        <Card className="text-left">
          <h3 className="font-semibold mb-2 text-sm">Top 5</h3>
          {state.participants.slice(0, 5).map((p, i) => (
            <div
              key={p.userId}
              className={`flex items-center justify-between py-1 ${p.userId === myUserId ? "font-bold text-sky-600" : ""}`}
            >
              <span>{i + 1}. {p.displayName}</span>
              <span className="font-mono">{p.score}</span>
            </div>
          ))}
        </Card>

        <Link href="/sus">
          <Button variant="secondary" className="mt-6 w-full">Zurück zum Lernraum</Button>
        </Link>
      </div>
    );
  }

  // Lobby
  if (state.state === "lobby" && (state.currentQuestion?.index ?? 0) === 0 && (!me || me.score === 0)) {
    return (
      <div className="text-center max-w-md mx-auto py-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 mx-auto mb-4 flex items-center justify-center">
          <Hourglass className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold">Bereit?</h1>
        <p className="text-slate-500 mb-2">{state.taskTitle}</p>
        <Card className="my-6">
          <p className="text-sm">Du bist drin. Warte auf den Start durch deine Lehrkraft.</p>
        </Card>
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
          <Users className="w-3 h-3" /> {state.participants.length} Mitspieler:innen
        </p>
      </div>
    );
  }

  // Zwischen-Leaderboard (für SuS)
  if (state.state === "leaderboard" || (state.state === "lobby" && (state.currentQuestion?.index ?? 0) > 0)) {
    return (
      <div className="max-w-md mx-auto py-4 text-center">
        <h2 className="text-lg font-bold mb-2">
          Stand nach Frage {(state.currentQuestion?.index ?? 0) + 1}
        </h2>
        {me && (
          <Card className="mb-4">
            <div className="text-xs uppercase text-slate-500">Du</div>
            <div className="text-3xl font-bold">{me.score}</div>
            <div className="text-sm text-slate-500">Punkte · Platz {myRank}</div>
          </Card>
        )}
        <Card className="text-left">
          <h3 className="font-semibold mb-2 text-sm">Top 5</h3>
          {state.participants.slice(0, 5).map((p, i) => (
            <div
              key={p.userId}
              className={`flex items-center justify-between py-1 ${p.userId === myUserId ? "font-bold text-sky-600" : ""}`}
            >
              <span>{i + 1}. {p.displayName}</span>
              <span className="font-mono">{p.score}</span>
            </div>
          ))}
        </Card>
        <p className="text-xs text-slate-500 mt-4">Warte auf die nächste Frage…</p>
      </div>
    );
  }

  // Question + Reveal
  const q = state.currentQuestion;
  if (!q) return null;

  const remaining = q.endsAt ? Math.max(0, q.endsAt - now) : 0;
  const remainingSec = Math.ceil(remaining / 1000);

  if (state.state === "reveal") {
    const myAnswerIsCorrect = selected != null && selected === q.correctIndex;
    return (
      <div className="max-w-md mx-auto py-4">
        <div className={`p-6 rounded-xl mb-4 text-center ${
          myAnswerIsCorrect
            ? "bg-emerald-500 text-white"
            : selected == null
              ? "bg-slate-200 dark:bg-slate-800"
              : "bg-rose-500 text-white"
        }`}>
          {myAnswerIsCorrect ? (
            <>
              <Check className="w-12 h-12 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Richtig!</h2>
              {me && <p className="mt-1">{me.score} Punkte gesamt</p>}
            </>
          ) : selected == null ? (
            <>
              <X className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <h2 className="text-xl font-bold">Nicht geantwortet</h2>
            </>
          ) : (
            <>
              <X className="w-12 h-12 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Leider falsch</h2>
            </>
          )}
        </div>
        <Card>
          <p className="font-semibold mb-2">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <div
                key={i}
                className={`p-2 rounded flex items-center gap-2 text-sm ${
                  i === q.correctIndex
                    ? "bg-emerald-100 dark:bg-emerald-900/30 font-semibold"
                    : selected === i
                      ? "bg-rose-100 dark:bg-rose-900/30 line-through"
                      : "bg-slate-50 dark:bg-slate-800"
                }`}
              >
                <span className="w-6 text-center font-bold">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
                {i === q.correctIndex && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
              </div>
            ))}
          </div>
          {q.explanation && <p className="text-xs text-sky-700 dark:text-sky-300 mt-3">💡 {q.explanation}</p>}
        </Card>
      </div>
    );
  }

  // Question (state === "question")
  const answered = selected != null;
  return (
    <div className="max-w-md mx-auto py-4">
      <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
        <span>Frage {q.index + 1} / {q.total}</span>
        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
          <Clock className="w-4 h-4" /> {remainingSec}s
        </span>
      </div>

      <Card className="mb-4">
        <h2 className="text-lg font-semibold">{q.question}</h2>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={answered}
              className={`p-4 rounded-xl text-white font-medium text-left transition-all ${OPTION_COLORS[i % OPTION_COLORS.length]} ${
                answered
                  ? isSelected
                    ? "ring-4 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 ring-current opacity-100"
                    : "opacity-40"
                  : "hover:scale-[1.02] active:scale-95"
              }`}
            >
              <div className="text-xs opacity-75 mb-1">Antwort {String.fromCharCode(65 + i)}</div>
              <div className="text-base">{opt}</div>
            </button>
          );
        })}
      </div>

      {answered && (
        <p className="text-center text-xs text-slate-500 mt-4">
          Antwort abgegeben — warte auf die Auswertung.
        </p>
      )}
    </div>
  );
}
