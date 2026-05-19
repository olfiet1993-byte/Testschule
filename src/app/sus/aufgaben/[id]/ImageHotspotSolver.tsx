"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitImageHotspot } from "@/lib/actions/tasks";
import { Confetti } from "@/components/Confetti";
import { ExamGate, ExamTimer } from "@/components/ExamGate";
import { Trophy, ArrowLeft, Star, Check, X } from "lucide-react";
import Link from "next/link";

type Hotspot = { id: string; x: number; y: number; radius?: number; label: string; explanation?: string };
const DEFAULT_RADIUS = 8;

export function ImageHotspotSolver({ task, prevSubmission }: { task: any; prevSubmission: any }) {
  const payload = JSON.parse(task.payload) as { imagePath: string; hotspots: Hotspot[] };
  const [pending, start] = useTransition();
  const [idx, setIdx] = useState(0);
  const [clicks, setClicks] = useState<Array<{ hotspotId: string; x: number; y: number }>>([]);
  const [result, setResult] = useState<{ correct: number; total: number; scorePct: number; xpEarned: number; details?: Array<{ hotspotId: string; hit: boolean }> } | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);

  if (task.examMode && !examStartedAt && !result) {
    return (
      <ExamGate
        task={task}
        prevSubmission={prevSubmission}
        onStart={() => setExamStartedAt(Date.now())}
      />
    );
  }

  const current = payload.hotspots[idx];
  const last = idx === payload.hotspots.length - 1;
  const progress = ((idx + 1) / payload.hotspots.length) * 100;

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newClick = { hotspotId: current.id, x, y };
    const updated = [...clicks.filter((c) => c.hotspotId !== current.id), newClick];
    setClicks(updated);
    if (last) {
      start(async () => {
        const r = await submitImageHotspot(task.id, updated);
        const details = payload.hotspots.map((h) => {
          const c = updated.find((cl) => cl.hotspotId === h.id);
          if (!c) return { hotspotId: h.id, hit: false };
          const dx = c.x - h.x, dy = c.y - h.y;
          const radius = h.radius ?? DEFAULT_RADIUS;
          return { hotspotId: h.id, hit: Math.sqrt(dx * dx + dy * dy) <= radius };
        });
        setResult({ ...r, details });
      });
    } else {
      setIdx(idx + 1);
    }
  }

  if (result) {
    const perfect = result.scorePct === 100;
    return (
      <div>
        <Confetti trigger={perfect} />
        <Card className={`text-center py-8 ${perfect ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white" : ""} mb-4`}>
          <Trophy className={`w-16 h-16 mx-auto mb-3 ${perfect ? "text-white" : "text-amber-500"}`} />
          <h2 className="text-2xl font-bold mb-1">
            {perfect ? "Alle Treffer! 🎯" : "Auswertung"}
          </h2>
          <p className={`mb-4 ${perfect ? "text-white/90" : "text-slate-500"}`}>
            {result.correct} von {result.total} richtig ({result.scorePct.toFixed(0)}%)
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${perfect ? "bg-white/20" : "bg-amber-100"}`}>
            <Star className={perfect ? "text-white" : "text-amber-600"} />
            <span className={`font-bold ${perfect ? "text-white" : "text-amber-700"}`}>+{result.xpEarned} XP</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">Auflösung</h3>
          <div className="relative inline-block max-w-full mb-4">
            <img src={payload.imagePath} alt="" className="max-w-full rounded-lg max-h-[500px]" />
            {payload.hotspots.map((h, i) => {
              const click = clicks.find((c) => c.hotspotId === h.id);
              const det = result.details?.find((d) => d.hotspotId === h.id);
              const hit = det?.hit;
              return (
                <div key={h.id}>
                  <div
                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-white border-2 border-white shadow-lg bg-emerald-500"
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                    title={`Korrekt: ${h.label}`}
                  >
                    {i + 1}
                  </div>
                  {click && (
                    <div
                      className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${hit ? "bg-emerald-300" : "bg-rose-500"}`}
                      style={{ left: `${click.x}%`, top: `${click.y}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <ul className="space-y-1 text-sm">
            {payload.hotspots.map((h, i) => {
              const det = result.details?.find((d) => d.hotspotId === h.id);
              return (
                <li key={h.id} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${det?.hit ? "bg-emerald-500" : "bg-rose-500"}`}>
                    {det?.hit ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  </span>
                  <span className="text-slate-500">{i + 1}.</span>
                  <strong>{h.label}</strong>
                </li>
              );
            })}
          </ul>
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
      {task.examMode && task.timeLimitMinutes && examStartedAt && (
        <ExamTimer
          startedAt={examStartedAt}
          limitMinutes={task.timeLimitMinutes}
          onTimeout={() => {
            start(async () => {
              const r = await submitImageHotspot(task.id, clicks);
              setResult({ ...r, details: [] });
            });
          }}
        />
      )}
      <Link href="/sus/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>
      <h1 className="text-2xl font-bold mb-1">{task.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        Aufgabe {idx + 1} von {payload.hotspots.length}
        {prevSubmission && <span className="ml-2 text-emerald-600">· zuletzt: {prevSubmission.scorePct?.toFixed(0)}%</span>}
      </p>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Card>
        <p className="font-semibold text-lg mb-3 flex items-center gap-2">
          🎯 Klicke auf: <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{current.label}</span>
        </p>
        <div
          onClick={handleImageClick}
          className="relative inline-block max-w-full cursor-crosshair select-none"
        >
          <img src={payload.imagePath} alt="Aufgabe" className="max-w-full rounded-lg max-h-[600px] block" draggable={false} />
        </div>
      </Card>
    </div>
  );
}
