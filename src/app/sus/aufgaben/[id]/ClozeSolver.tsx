"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitCloze } from "@/lib/actions/tasks";
import { Confetti } from "@/components/Confetti";
import { Trophy, ArrowLeft, Star, Check, X } from "lucide-react";
import Link from "next/link";

type Blank = { index: number; answers: string[]; caseSensitive?: boolean };
type Payload = { text: string; blanks: Blank[] };
type Detail = { index: number; given: string; ok: boolean; expected: string[] };

// Splittet den Text an {{...}}-Markern und gibt Stücke + Lücken zurück.
function splitText(text: string) {
  const parts: Array<{ type: "text" | "blank"; content: string; blankIndex?: number }> = [];
  const regex = /\{\{([^}]*)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "blank", content: m[1], blankIndex: i++ });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

export function ClozeSolver({ task, prevSubmission }: { task: any; prevSubmission: any }) {
  const payload = JSON.parse(task.payload) as Payload;
  const parts = useMemo(() => splitText(payload.text), [payload.text]);
  const [pending, start] = useTransition();
  const [answers, setAnswers] = useState<string[]>(() => payload.blanks.map(() => ""));
  const [result, setResult] = useState<{
    correct: number; total: number; scorePct: number; xpEarned: number; details: Detail[];
  } | null>(null);

  function setAnswer(i: number, val: string) {
    setAnswers((a) => a.map((v, idx) => (idx === i ? val : v)));
  }

  function submit() {
    start(async () => {
      const r = await submitCloze(task.id, answers);
      setResult(r);
    });
  }

  const allFilled = answers.every((a) => a.trim().length > 0);

  if (result) {
    const perfect = result.scorePct === 100;
    return (
      <div>
        <Confetti trigger={perfect} />
        <Card className={`text-center py-8 mb-4 ${perfect ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : ""}`}>
          <Trophy className={`w-16 h-16 mx-auto mb-3 ${perfect ? "text-white" : "text-amber-500"}`} />
          <h2 className="text-2xl font-bold mb-1">{perfect ? "Lückenlos!" : "Ausgewertet"}</h2>
          <p className={`mb-4 ${perfect ? "text-white/90" : "text-slate-500"}`}>
            {result.correct} von {result.total} Lücken richtig ({result.scorePct.toFixed(0)}%)
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${perfect ? "bg-white/20" : "bg-amber-100"}`}>
            <Star className={perfect ? "text-white" : "text-amber-600"} />
            <span className={`font-bold ${perfect ? "text-white" : "text-amber-700"}`}>+{result.xpEarned} XP</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Auswertung im Text</h3>
          <div className="text-base leading-relaxed whitespace-pre-wrap">
            {parts.map((p, k) => {
              if (p.type === "text") return <Fragment key={k}>{p.content}</Fragment>;
              const det = result.details.find((d) => d.index === p.blankIndex);
              if (!det) return null;
              return (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded font-medium ${
                    det.ok
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 line-through"
                  }`}
                  title={det.ok ? "richtig" : `richtig: ${det.expected.join(" / ")}`}
                >
                  {det.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {det.given || "—"}
                </span>
              );
            })}
          </div>
          {result.details.some((d) => !d.ok) && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 mb-2">Korrekturen</div>
              <ul className="space-y-1 text-sm">
                {result.details.filter((d) => !d.ok).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono">[{d.index + 1}]</span>
                    <span>
                      <span className="line-through text-rose-600">{d.given || "—"}</span>
                      {" → "}
                      <strong className="text-emerald-700 dark:text-emerald-400">{d.expected[0]}</strong>
                      {d.expected.length > 1 && (
                        <span className="text-slate-500 text-xs"> (auch: {d.expected.slice(1).join(", ")})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="flex gap-2 mt-6">
          <Link href="/sus/aufgaben" className="flex-1">
            <Button variant="secondary" className="w-full">Zurück zu Aufgaben</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>
      <h1 className="text-2xl font-bold mb-1">{task.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        {payload.blanks.length} Lücken füllen
        {prevSubmission && <span className="ml-2 text-emerald-600">· zuletzt: {prevSubmission.scorePct?.toFixed(0)}%</span>}
      </p>

      <Card>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {parts.map((p, k) => {
            if (p.type === "text") return <Fragment key={k}>{p.content}</Fragment>;
            const i = p.blankIndex!;
            return (
              <input
                key={k}
                type="text"
                value={answers[i] ?? ""}
                onChange={(e) => setAnswer(i, e.target.value)}
                placeholder={`[${i + 1}]`}
                className="inline-block mx-1 px-2 py-0.5 min-w-[80px] border-b-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-500 focus:outline-none focus:border-amber-600 text-amber-900 dark:text-amber-200 font-medium"
                size={Math.max(8, (answers[i] ?? "").length + 2)}
              />
            );
          })}
        </div>
      </Card>

      <Button
        onClick={submit}
        disabled={!allFilled || pending}
        className="w-full mt-6"
        size="lg"
      >
        {pending ? "…" : "Abgeben"}
      </Button>
      {!allFilled && (
        <p className="text-xs text-center text-slate-500 mt-2">Bitte alle Lücken ausfüllen.</p>
      )}
    </div>
  );
}
