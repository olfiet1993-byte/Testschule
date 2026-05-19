"use client";

import { useEffect, useState, useRef } from "react";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Play, FastForward, X, Users, Trophy, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

type Participant = { userId: string; displayName: string; score: number; xpEarned?: number; avatarEmoji?: string | null; avatarColor?: string | null };
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
  classId: string;
  className: string;
  taskTitle: string;
  state: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
  currentQuestion: Question | null;
  participants: Participant[];
  questionDurationMs: number;
};

const POS_COLORS = ["#fbbf24", "#cbd5e1", "#f97316"]; // Gold, Silber, Bronze

export function HostView({ initialState, sessionId }: { initialState: State; sessionId: string }) {
  const [state, setState] = useState<State>(initialState);
  const [now, setNow] = useState(Date.now());
  const startedRef = useRef(false);

  // SSE-Verbindung
  useEffect(() => {
    const es = new EventSource(`/api/live/${sessionId}/stream`);
    es.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data));
      } catch {}
    };
    es.onerror = () => {
      // browser reconnects automatically
    };
    return () => es.close();
  }, [sessionId]);

  // Tick für Countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  async function call(action: string, body: Record<string, any> = {}) {
    await fetch(`/api/live/${sessionId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
  }

  // Auto-start bei Klassenbeitritt? Nein, manuelle Kontrolle.
  const remaining = state.currentQuestion?.endsAt
    ? Math.max(0, state.currentQuestion.endsAt - now)
    : 0;
  const remainingSec = Math.ceil(remaining / 1000);
  const progressPct = state.currentQuestion?.endsAt && state.currentQuestion?.startedAt
    ? Math.max(0, Math.min(100, (remaining / (state.currentQuestion.endsAt - state.currentQuestion.startedAt)) * 100))
    : 0;

  if (state.state === "ended") {
    const totalXp = state.participants.reduce((a, p) => a + (p.xpEarned ?? 0), 0);
    return (
      <div>
        <div className="text-center mb-6">
          <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-2" />
          <h1 className="text-3xl font-bold">Quiz beendet</h1>
          <p className="text-slate-500">{state.taskTitle} · {state.className}</p>
        </div>
        <Card className="max-w-2xl mx-auto mb-6 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm">
                Resultate gespeichert · <strong>{totalXp} XP</strong> verteilt an {state.participants.length} SuS
              </span>
            </div>
            <Link href={`/klassen/${state.classId}/statistik`}>
              <Button size="sm" variant="secondary">
                <TrendingUp className="w-4 h-4" /> Klassen-Statistik
              </Button>
            </Link>
          </div>
        </Card>
        <Leaderboard participants={state.participants} title="Endrangliste" />
      </div>
    );
  }

  // Lobby
  if (state.state === "lobby" && state.currentQuestion?.index === 0 && state.participants.every((p) => p.score === 0)) {
    return (
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{state.taskTitle}</h1>
          <p className="text-sm text-slate-500">{state.className} · Live-Quiz</p>
        </div>
        <Card className="bg-gradient-to-br from-sky-500 to-violet-500 text-white border-0 mb-6">
          <div className="text-sm uppercase tracking-wider opacity-80 mb-1">Beitritts-Code</div>
          <div className="text-6xl font-mono font-bold tracking-widest mb-2">{state.code}</div>
          <p className="text-sm text-white/80">
            Schüler:innen öffnen <code className="bg-white/20 px-1 rounded">http://imac-von-oliver:3000</code> und tippen diesen Code im Lobby-Banner ihres Dashboards ein.
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="!p-4">
            <Users className="w-5 h-5 text-sky-500 mb-1" />
            <div className="text-3xl font-bold">{state.participants.length}</div>
            <div className="text-xs text-slate-500">SuS in Lobby</div>
          </Card>
          <Card className="!p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
            <div className="text-3xl font-bold">{state.currentQuestion?.total ?? 0}</div>
            <div className="text-xs text-slate-500">Fragen</div>
          </Card>
        </div>

        {state.participants.length > 0 && (
          <Card className="mb-6 text-left">
            <h3 className="font-semibold mb-3">Beigetreten:</h3>
            <div className="flex flex-wrap gap-2">
              {state.participants.map((p) => (
                <span key={p.userId} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm font-medium">
                  <Avatar user={p} size={24} />
                  {p.displayName}
                </span>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-2 justify-center">
          <Button
            size="lg"
            onClick={() => call("start_question")}
            disabled={state.participants.length === 0}
          >
            <Play className="w-5 h-5" /> Quiz starten
          </Button>
          <Button size="lg" variant="danger" onClick={() => call("end")}>
            <X className="w-5 h-5" /> Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  // Zwischen Fragen (after leaderboard, before next question)
  if (state.state === "lobby" || state.state === "leaderboard") {
    const isLast = (state.currentQuestion?.index ?? 0) >= (state.currentQuestion?.total ?? 1) - 1
      && state.state === "leaderboard";
    return (
      <div>
        <Leaderboard participants={state.participants} title={`Stand nach Frage ${(state.currentQuestion?.index ?? 0) + 1}`} />
        <div className="flex gap-2 mt-6 justify-center">
          {state.state === "leaderboard" && !isLast && (
            <Button size="lg" onClick={() => call("next_question")}>
              <FastForward className="w-4 h-4" /> Nächste Frage
            </Button>
          )}
          {state.state === "lobby" && (
            <Button size="lg" onClick={() => call("start_question")}>
              <Play className="w-4 h-4" /> Frage {(state.currentQuestion?.index ?? 0) + 1} starten
            </Button>
          )}
          {isLast && (
            <Button size="lg" onClick={() => call("end")}>
              <Trophy className="w-4 h-4" /> Quiz beenden
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Question + Reveal
  const showAnswer = state.state === "reveal";
  const q = state.currentQuestion;
  if (!q) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3 text-sm text-slate-500">
        <span>Frage {q.index + 1} / {q.total}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" /> {q.answersCount} / {state.participants.length} geantwortet
        </span>
        {state.state === "question" && (
          <span className="inline-flex items-center gap-1 font-bold text-amber-600">
            <Clock className="w-3 h-3" /> {remainingSec}s
          </span>
        )}
      </div>

      {state.state === "question" && (
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <Card className="mb-4">
        <h2 className="text-xl font-semibold">{q.question}</h2>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isCorrect = showAnswer && q.correctIndex === i;
          const isWrong = showAnswer && q.correctIndex !== i;
          return (
            <div
              key={i}
              className={`p-4 rounded-lg border-2 flex items-center gap-3 transition ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                  : isWrong
                    ? "border-rose-300 bg-rose-50 dark:bg-rose-900/20 opacity-60"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                isCorrect ? "bg-emerald-500" : "bg-slate-400"
              }`}>{String.fromCharCode(65 + i)}</span>
              <span className="font-medium">{opt}</span>
              {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
            </div>
          );
        })}
      </div>

      {showAnswer && q.explanation && (
        <Card className="mt-4 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800">
          <p className="text-sm">💡 {q.explanation}</p>
        </Card>
      )}
    </div>
  );
}

function Leaderboard({ participants, title }: { participants: Participant[]; title: string }) {
  const top = participants.slice(0, 10);
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-2">
        {top.map((p, i) => (
          <Card
            key={p.userId}
            className={`!py-3 flex items-center justify-between ${
              i < 3 ? "border-l-4" : ""
            }`}
            style={i < 3 ? { borderLeftColor: POS_COLORS[i] } : undefined}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${
                  i < 3 ? "text-white" : "bg-slate-100 dark:bg-slate-800"
                }`}
                style={i < 3 ? { background: POS_COLORS[i] } : undefined}
              >
                {i + 1}
              </div>
              <Avatar user={p} size={32} />
              <span className="font-medium">{p.displayName}</span>
            </div>
            <div className="font-mono font-bold text-lg">{p.score}</div>
          </Card>
        ))}
        {participants.length === 0 && (
          <p className="text-slate-500 text-center py-8">Niemand hat geantwortet.</p>
        )}
      </div>
    </div>
  );
}
