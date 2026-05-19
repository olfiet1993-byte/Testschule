"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GraduationCap, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

/**
 * Zeigt einen Vorschalt-Screen bei Klausur-Modus an.
 * - Wenn schon abgegeben → Lock-Screen
 * - Sonst Bestätigung mit "Klausur jetzt starten"
 */
export function ExamGate({
  task,
  prevSubmission,
  onStart,
}: {
  task: any;
  prevSubmission: any;
  onStart: () => void;
}) {
  // Bereits abgegeben → Lock
  if (prevSubmission) {
    return (
      <Card className="text-center py-12 bg-slate-100 dark:bg-slate-800">
        <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-3" />
        <h2 className="text-2xl font-bold mb-1">Klausur abgegeben</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Du hast diese Klausur am{" "}
          <strong>{new Date(prevSubmission.submittedAt).toLocaleString("de-DE")}</strong> abgegeben.
        </p>
        {task.answersRevealedAt ? (
          <Link href={`/sus/aufgaben/${task.id}?reveal=1`}>
            <Button>Auflösung ansehen</Button>
          </Link>
        ) : (
          <p className="text-xs text-slate-500">
            Die Auflösung wird sichtbar, sobald deine Lehrkraft sie freigibt.
          </p>
        )}
        <div className="mt-6">
          <Link href="/sus/aufgaben" className="text-sm text-slate-500 hover:underline">
            Zurück zur Aufgabenliste
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-rose-300 bg-rose-50/30 dark:bg-rose-900/10 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Klausur</h2>
          <p className="text-xs text-slate-500">Bitte vorher lesen</p>
        </div>
      </div>
      <ul className="text-sm space-y-2 mb-4">
        <li className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span><strong>Nur ein Versuch</strong> — sobald du absendest, ist die Abgabe endgültig.</span>
        </li>
        {task.timeLimitMinutes && (
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span>
              Zeitlimit: <strong>{task.timeLimitMinutes} Minuten</strong> ab Klick auf "Klausur starten".
              Nach Ablauf wird automatisch abgegeben.
            </span>
          </li>
        )}
        <li className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>Die korrekten Antworten siehst du erst, wenn deine Lehrkraft sie freigibt.</span>
        </li>
      </ul>
      <div className="flex gap-2">
        <Link href="/sus/aufgaben" className="flex-1">
          <Button variant="secondary" className="w-full">Doch nicht jetzt</Button>
        </Link>
        <Button onClick={onStart} variant="danger" className="flex-1">
          Klausur jetzt starten
        </Button>
      </div>
    </Card>
  );
}

/**
 * Live-Timer für laufende Klausuren. Ruft onTimeout auf wenn abgelaufen.
 */
export function ExamTimer({
  startedAt,
  limitMinutes,
  onTimeout,
}: {
  startedAt: number;
  limitMinutes: number;
  onTimeout: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const endsAt = startedAt + limitMinutes * 60 * 1000;
  const remaining = Math.max(0, endsAt - now);
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const total = limitMinutes * 60 * 1000;
  const pct = (remaining / total) * 100;

  useEffect(() => {
    if (remaining === 0) onTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0]);

  const urgent = remaining < 60_000;

  return (
    <div className={`sticky top-14 md:top-2 z-10 mb-4 p-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
      urgent ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    }`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
        <div className={`h-full ${urgent ? "bg-white" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
