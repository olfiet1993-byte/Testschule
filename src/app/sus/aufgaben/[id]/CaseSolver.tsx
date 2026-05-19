"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitCase } from "@/lib/actions/tasks";
import { Confetti } from "@/components/Confetti";
import { Stethoscope, ArrowLeft, ArrowRight, Trophy, Star, Check, X } from "lucide-react";
import Link from "next/link";

type Option = { text: string; feedback?: string; isCorrect: boolean; next: string | null };
type Step = { id: string; description: string; question: string; options: Option[] };
type Payload = { intro: string; steps: Step[] };
type Decision = { stepId: string; optionIdx: number };

export function CaseSolver({ task, prevSubmission }: { task: any; prevSubmission: any }) {
  const payload = JSON.parse(task.payload) as Payload;
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"intro" | "step" | "feedback" | "ended">("intro");
  const [currentStepId, setCurrentStepId] = useState<string>(payload.steps[0]?.id ?? "");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; scorePct: number; xpEarned: number } | null>(null);

  const currentStep = payload.steps.find((s) => s.id === currentStepId);
  const stepIndex = payload.steps.findIndex((s) => s.id === currentStepId);

  function startCase() {
    setPhase("step");
  }

  function choose(optionIdx: number) {
    if (!currentStep) return;
    const decision: Decision = { stepId: currentStep.id, optionIdx };
    setDecisions((d) => [...d, decision]);
    setLastDecision(decision);
    setPhase("feedback");
  }

  function continueAfterFeedback() {
    if (!currentStep || !lastDecision) return;
    const opt = currentStep.options[lastDecision.optionIdx];
    if (!opt || !opt.next) {
      // Ende des Falls
      finish();
    } else {
      setCurrentStepId(opt.next);
      setLastDecision(null);
      setPhase("step");
    }
  }

  function finish() {
    start(async () => {
      const r = await submitCase(task.id, decisions);
      setResult(r);
      setPhase("ended");
    });
  }

  // Intro
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="text-sm text-slate-500">Fallstudie · {payload.steps.length} Schritte</p>
          </div>
        </div>
        <Card className="mb-6 bg-emerald-50/30 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900">
          <p className="text-base whitespace-pre-wrap">{payload.intro}</p>
        </Card>
        {prevSubmission && (
          <p className="text-sm text-emerald-600 mb-3">
            Bereits gelöst: {prevSubmission.scorePct?.toFixed(0)}% · +{prevSubmission.xpEarned} XP
          </p>
        )}
        <Button onClick={startCase} size="lg" className="w-full">
          Fall starten <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Schritt
  if (phase === "step" && currentStep) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3 text-sm text-slate-500">
          <span>Schritt {stepIndex + 1} / {payload.steps.length}</span>
          <span>{decisions.length} Entscheidung{decisions.length === 1 ? "" : "en"}</span>
        </div>
        <Card className="mb-4">
          <p className="text-base whitespace-pre-wrap text-slate-700 dark:text-slate-300 mb-3">
            {currentStep.description}
          </p>
          <h2 className="text-lg font-semibold">{currentStep.question}</h2>
        </Card>
        <div className="space-y-2">
          {currentStep.options.map((opt, oi) => (
            <button
              key={oi}
              onClick={() => choose(oi)}
              className="w-full text-left px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition flex items-center gap-3"
            >
              <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {String.fromCharCode(65 + oi)}
              </span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Inline-Feedback
  if (phase === "feedback" && currentStep && lastDecision) {
    const opt = currentStep.options[lastDecision.optionIdx];
    const isCorrect = opt.isCorrect;
    const isLast = !opt.next;
    return (
      <div className="max-w-2xl mx-auto">
        <Card className={`mb-4 ${
          isCorrect
            ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-800"
            : "bg-rose-50 border-rose-300 dark:bg-rose-900/20 dark:border-rose-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white ${
              isCorrect ? "bg-emerald-500" : "bg-rose-500"
            }`}>
              {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </span>
            <h3 className="font-bold">
              {isCorrect ? "Gut entschieden" : "Nicht optimal"}
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            <strong>Deine Wahl:</strong> {opt.text}
          </p>
          {opt.feedback && (
            <p className="text-sm bg-white/60 dark:bg-slate-900/40 p-3 rounded-md italic">
              💡 {opt.feedback}
            </p>
          )}
        </Card>
        <Button onClick={continueAfterFeedback} disabled={pending} size="lg" className="w-full">
          {isLast ? "Fall abschließen" : "Weiter"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Auswertung
  if (phase === "ended" && result) {
    const perfect = result.scorePct === 100;
    return (
      <div className="max-w-2xl mx-auto">
        <Confetti trigger={perfect} />
        <Card className={`text-center py-8 mb-4 ${perfect ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white" : ""}`}>
          <Trophy className={`w-16 h-16 mx-auto mb-3 ${perfect ? "text-white" : "text-amber-500"}`} />
          <h2 className="text-2xl font-bold mb-1">
            {perfect ? "Fall optimal gelöst!" : "Fall abgeschlossen"}
          </h2>
          <p className={`mb-4 ${perfect ? "text-white/90" : "text-slate-500"}`}>
            {result.correct} von {result.total} Entscheidungen optimal ({result.scorePct.toFixed(0)}%)
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${perfect ? "bg-white/20" : "bg-amber-100"}`}>
            <Star className={perfect ? "text-white" : "text-amber-600"} />
            <span className={`font-bold ${perfect ? "text-white" : "text-amber-700"}`}>+{result.xpEarned} XP</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Dein Pfad durch den Fall</h3>
          <ol className="space-y-3">
            {decisions.map((d, i) => {
              const step = payload.steps.find((s) => s.id === d.stepId);
              const opt = step?.options[d.optionIdx];
              if (!step || !opt) return null;
              return (
                <li key={i} className="border-l-2 pl-3" style={{ borderColor: opt.isCorrect ? "#10b981" : "#f43f5e" }}>
                  <div className="text-xs text-slate-500 mb-1">{step.question}</div>
                  <div className="text-sm">
                    <span className={`inline-flex items-center gap-1 ${opt.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                      {opt.isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {opt.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="flex gap-2 mt-6">
          <Link href="/sus/aufgaben" className="flex-1">
            <Button variant="secondary" className="w-full">Zurück zu Aufgaben</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
