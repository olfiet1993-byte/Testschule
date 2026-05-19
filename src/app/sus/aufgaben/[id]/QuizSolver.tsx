"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitQuiz } from "@/lib/actions/tasks";
import { Confetti } from "@/components/Confetti";
import { ExamGate, ExamTimer } from "@/components/ExamGate";
import { Check, X, Trophy, ArrowLeft, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export function QuizSolver({ task, prevSubmission }: { task: any; prevSubmission: any }) {
  const payload = JSON.parse(task.payload) as { questions: Question[] };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(payload.questions.map(() => -1));
  const [showResult, setShowResult] = useState<{ correct: number; total: number; scorePct: number; xpEarned: number } | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const isReveal = searchParams.get("reveal") === "1";

  // Klausur-Gate
  if (task.examMode && !examStartedAt && !isReveal) {
    return (
      <ExamGate
        task={task}
        prevSubmission={prevSubmission}
        onStart={() => setExamStartedAt(Date.now())}
      />
    );
  }

  // Auflösungs-Modus für abgegebene Klausuren (read-only mit korrekten Antworten)
  if (isReveal && prevSubmission && task.answersRevealedAt) {
    return (
      <div>
        <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <h1 className="text-2xl font-bold mb-1">{task.title} · Auflösung</h1>
        <p className="text-sm text-slate-500 mb-4">
          Dein Ergebnis: {prevSubmission.scorePct?.toFixed(0)}% · +{prevSubmission.xpEarned} XP
        </p>
        {(() => {
          let myAns: number[] = [];
          try { myAns = JSON.parse(prevSubmission.answer ?? "[]"); } catch {}
          return (
            <div className="space-y-3">
              {payload.questions.map((q, qi) => {
                const mine = myAns[qi];
                return (
                  <Card key={qi} className="!p-4">
                    <div className="text-xs text-slate-500 mb-1">Frage {qi + 1}</div>
                    <h3 className="font-semibold mb-2">{q.question}</h3>
                    <ul className="space-y-1 text-sm">
                      {q.options.map((opt, oi) => {
                        const isCorrect = oi === q.correctIndex;
                        const wasMine = oi === mine;
                        return (
                          <li
                            key={oi}
                            className={`px-2 py-1 rounded flex items-center gap-2 ${
                              isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30 font-medium" :
                              wasMine ? "bg-rose-100 dark:bg-rose-900/30 line-through" : ""
                            }`}
                          >
                            <span className="w-5 text-center font-bold">{String.fromCharCode(65 + oi)}</span>
                            <span>{opt}</span>
                            {isCorrect && <Check className="w-4 h-4 ml-auto text-emerald-600" />}
                            {wasMine && !isCorrect && <X className="w-4 h-4 ml-auto text-rose-600" />}
                          </li>
                        );
                      })}
                    </ul>
                    {q.explanation && <p className="mt-2 text-xs text-sky-700 dark:text-sky-300">💡 {q.explanation}</p>}
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  }

  function selectOption(oi: number) {
    setAnswers((a) => a.map((v, i) => (i === step ? oi : v)));
  }

  function onTimeout() {
    // Auto-Submit beim Zeitablauf
    submit();
  }

  function submit() {
    start(async () => {
      const result = await submitQuiz(task.id, answers);
      setShowResult(result);
    });
  }

  if (showResult) {
    const perfect = showResult.scorePct === 100;
    return (
      <>
        <Confetti trigger={perfect} />
      <Card className={`text-center py-12 ${perfect ? "bg-gradient-to-br from-emerald-500 to-sky-500 text-white" : ""}`}>
        <Trophy className={`w-20 h-20 mx-auto mb-4 ${perfect ? "text-white" : "text-amber-500"}`} />
        <h2 className="text-3xl font-bold mb-2">
          {perfect ? "Perfekt! 🎉" : showResult.scorePct >= 70 ? "Gut gemacht!" : "Nicht aufgeben!"}
        </h2>
        <p className={`text-lg mb-6 ${perfect ? "text-white/90" : "text-slate-500"}`}>
          {showResult.correct} von {showResult.total} richtig ({showResult.scorePct.toFixed(0)}%)
        </p>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${perfect ? "bg-white/20" : "bg-amber-100"}`}>
          <Star className={perfect ? "text-white" : "text-amber-600"} />
          <span className={`font-bold ${perfect ? "text-white" : "text-amber-700"}`}>+{showResult.xpEarned} XP</span>
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

  const q = payload.questions[step];
  const allAnswered = answers.every((a) => a !== -1);
  const progress = ((step + 1) / payload.questions.length) * 100;

  return (
    <div>
      {task.examMode && task.timeLimitMinutes && examStartedAt && (
        <ExamTimer startedAt={examStartedAt} limitMinutes={task.timeLimitMinutes} onTimeout={onTimeout} />
      )}
      <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="text-2xl font-bold mb-1">{task.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        Frage {step + 1} von {payload.questions.length}
        {prevSubmission && (
          <span className="ml-2 text-emerald-600">· bereits gelöst: {prevSubmission.scorePct?.toFixed(0)}%</span>
        )}
      </p>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
        <div className="bg-sky-500 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((opt, oi) => {
            const selected = answers[step] === oi;
            return (
              <button
                key={oi}
                onClick={() => selectOption(oi)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition flex items-center gap-3 ${
                  selected
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  selected ? "bg-sky-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>{String.fromCharCode(65 + oi)}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-2 mt-6">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Button>
        {step < payload.questions.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={answers[step] === -1}
            className="flex-1"
          >
            Weiter <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={!allAnswered || pending}
            className="flex-1"
          >
            {pending ? "…" : "Abgeben"}
          </Button>
        )}
      </div>
    </div>
  );
}
