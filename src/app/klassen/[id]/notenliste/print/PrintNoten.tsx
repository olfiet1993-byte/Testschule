"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Member = { id: string; displayName: string; xp: number; level: number };
type Task = {
  id: string;
  title: string;
  type: string;
  classId: string;
  xpReward: number;
  publishedAt: number | string | null;
  difficulty?: number | null;
  createdAt: number;
};
type Submission = {
  id: string;
  userId: string;
  taskId: string;
  score: number | null;
  maxScore: number | null;
  submittedAt: number;
};
type Klass = {
  id: string;
  name: string;
  yearGroup?: { name: string } | null;
};

const DIFF_SHORT: Record<number, string> = { 1: "L", 2: "M", 3: "S" };

function pct(score: number | null, max: number | null): number | null {
  if (score == null || !max) return null;
  return Math.round((score / max) * 100);
}

function gradeFromPct(p: number | null): string {
  if (p == null) return "—";
  if (p >= 92) return "1";
  if (p >= 81) return "2";
  if (p >= 67) return "3";
  if (p >= 50) return "4";
  if (p >= 30) return "5";
  return "6";
}

export function PrintNoten({
  klass,
  members,
  tasks,
  submissions,
  teacherName,
}: {
  klass: Klass;
  members: Member[];
  tasks: Task[];
  submissions: Submission[];
  teacherName: string;
}) {
  // Nur veröffentlichte Aufgaben anzeigen
  const visibleTasks = useMemo(
    () => tasks.filter((t) => Boolean(t.publishedAt)),
    [tasks]
  );

  // Map: userId -> taskId -> Submission
  const subMap = useMemo(() => {
    const m = new Map<string, Map<string, Submission>>();
    for (const s of submissions) {
      if (!m.has(s.userId)) m.set(s.userId, new Map());
      // Falls mehrere: letzte gewinnt (höchster submittedAt)
      const existing = m.get(s.userId)!.get(s.taskId);
      if (!existing || s.submittedAt > existing.submittedAt) {
        m.get(s.userId)!.set(s.taskId, s);
      }
    }
    return m;
  }, [submissions]);

  // Pro Schüler Durchschnitt
  const studentAvg = useMemo(() => {
    const out = new Map<string, number | null>();
    for (const u of members) {
      const subs = visibleTasks
        .map((t) => subMap.get(u.id)?.get(t.id))
        .filter((s): s is Submission => !!s);
      if (subs.length === 0) {
        out.set(u.id, null);
        continue;
      }
      const ps = subs.map((s) => pct(s.score, s.maxScore)).filter((p): p is number => p != null);
      if (ps.length === 0) {
        out.set(u.id, null);
        continue;
      }
      out.set(u.id, Math.round(ps.reduce((a, b) => a + b, 0) / ps.length));
    }
    return out;
  }, [members, visibleTasks, subMap]);

  // Pro Aufgabe Durchschnitt
  const taskAvg = useMemo(() => {
    const out = new Map<string, number | null>();
    for (const t of visibleTasks) {
      const ps = members
        .map((u) => subMap.get(u.id)?.get(t.id))
        .filter((s): s is Submission => !!s)
        .map((s) => pct(s.score, s.maxScore))
        .filter((p): p is number => p != null);
      out.set(t.id, ps.length === 0 ? null : Math.round(ps.reduce((a, b) => a + b, 0) / ps.length));
    }
    return out;
  }, [visibleTasks, members, subMap]);

  const dateStr = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto print:p-0 print:max-w-none bg-white text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          html,
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-table {
            font-size: 9pt;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #999 !important;
            padding: 3px 5px !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/klassen/${klass.id}/statistik`}
          className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zur Statistik
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Drucken / als PDF speichern
        </Button>
      </div>

      {/* Kopf */}
      <header className="mb-6 border-b border-slate-300 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notenliste — {klass.name}</h1>
            {klass.yearGroup?.name && (
              <p className="text-sm text-slate-600">Jahrgang: {klass.yearGroup.name}</p>
            )}
            <p className="text-sm text-slate-600">Lehrkraft: {teacherName}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>Stand: {dateStr}</p>
            <p>{members.length} Schüler:innen · {visibleTasks.length} Aufgaben</p>
          </div>
        </div>
      </header>

      {visibleTasks.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Noch keine veröffentlichten Aufgaben.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="print-table w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-2 py-2 text-left sticky left-0 bg-slate-100 min-w-[180px]">
                  Schüler:in
                </th>
                {visibleTasks.map((t) => (
                  <th
                    key={t.id}
                    className="border border-slate-300 px-2 py-2 text-center align-top min-w-[80px] max-w-[120px]"
                  >
                    <div className="font-semibold truncate" title={t.title}>
                      {t.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {t.type}
                      {t.difficulty && DIFF_SHORT[t.difficulty]
                        ? ` · ${DIFF_SHORT[t.difficulty]}`
                        : ""}
                    </div>
                  </th>
                ))}
                <th className="border border-slate-300 px-2 py-2 text-center bg-amber-50">
                  Ø %
                </th>
                <th className="border border-slate-300 px-2 py-2 text-center bg-amber-50">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((u) => {
                const avg = studentAvg.get(u.id) ?? null;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 py-1 font-medium sticky left-0 bg-white">
                      {u.displayName}
                    </td>
                    {visibleTasks.map((t) => {
                      const s = subMap.get(u.id)?.get(t.id);
                      const p = s ? pct(s.score, s.maxScore) : null;
                      return (
                        <td
                          key={t.id}
                          className={`border border-slate-300 px-2 py-1 text-center ${
                            p == null
                              ? "text-slate-300"
                              : p >= 80
                              ? "text-emerald-700"
                              : p >= 50
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {p == null ? "—" : `${p}%`}
                        </td>
                      );
                    })}
                    <td className="border border-slate-300 px-2 py-1 text-center font-semibold bg-amber-50">
                      {avg == null ? "—" : `${avg}%`}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-bold bg-amber-50">
                      {gradeFromPct(avg)}
                    </td>
                  </tr>
                );
              })}
              {/* Spaltendurchschnitt */}
              <tr className="bg-slate-100 font-semibold">
                <td className="border border-slate-300 px-2 py-2 sticky left-0 bg-slate-100">
                  Ø Aufgabe
                </td>
                {visibleTasks.map((t) => {
                  const a = taskAvg.get(t.id);
                  return (
                    <td
                      key={t.id}
                      className="border border-slate-300 px-2 py-2 text-center"
                    >
                      {a == null ? "—" : `${a}%`}
                    </td>
                  );
                })}
                <td className="border border-slate-300 px-2 py-2 text-center bg-amber-100">—</td>
                <td className="border border-slate-300 px-2 py-2 text-center bg-amber-100">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legende */}
      <div className="mt-6 text-xs text-slate-600 space-y-1">
        <p>
          <strong>Notenschlüssel:</strong> 1 (≥92%) · 2 (≥81%) · 3 (≥67%) · 4 (≥50%) · 5 (≥30%) · 6 (&lt;30%)
        </p>
        <p>
          <strong>Schwierigkeit:</strong> L = leicht · M = mittel · S = schwer
        </p>
      </div>

      {/* Unterschrift */}
      <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
        <div>
          <div className="border-t border-slate-400 pt-1">Datum, Ort</div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1">
            Unterschrift Lehrkraft ({teacherName})
          </div>
        </div>
      </div>
    </div>
  );
}
