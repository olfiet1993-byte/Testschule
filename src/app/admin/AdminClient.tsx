"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Input } from "@/components/ui/Input";
import {
  ShieldCheck, GraduationCap, Users, Clock, ClipboardList, TrendingUp,
  Search, Star, Flame, Library,
} from "lucide-react";
import { AdminFeedbackPanel, type AdminFeedbackRow } from "./AdminFeedbackPanel";

type TeacherRow = {
  id: string;
  name: string;
  email: string;
  tasksCreated: number;
  tasksPublished: number;
  libraryItems: number;
  classCount: number;
  minutesTotal: number;
  minutes7: number;
  activeDays: number;
  lastActiveAt: number | null;
};

type StudentRow = {
  id: string;
  name: string;
  className: string;
  submissions: number;
  avgScore: number | null;
  perfect: number;
  xp: number;
  level: number;
  streak: number;
  minutesTotal: number;
  minutes7: number;
  activeDays: number;
  lastActiveAt: number | null;
};

function fmtMinutes(min: number): string {
  if (min <= 0) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest > 0 ? `${h} h ${rest} min` : `${h} h`;
}

function timeAgo(ts: number | null): string {
  if (!ts) return "nie";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "gerade eben";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  return `vor ${Math.floor(sec / 86400)} T`;
}

function scoreColor(pct: number | null): string {
  if (pct == null) return "text-slate-400";
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function AdminClient({
  stats,
  teachers,
  students,
  feedback,
}: {
  stats: {
    teachers: number;
    students: number;
    activeToday: number;
    totalMinutes: number;
    totalTasks: number;
    totalSubmissions: number;
  };
  teachers: TeacherRow[];
  students: StudentRow[];
  feedback: AdminFeedbackRow[];
}) {
  const [tab, setTab] = useState<"teachers" | "students" | "feedback">("teachers");
  const [filter, setFilter] = useState("");
  const openFeedback = feedback.filter((f) => f.status === "open").length;

  const filteredTeachers = useMemo(() => {
    const q = filter.toLowerCase();
    return teachers
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
      .sort((a, b) => b.minutes7 - a.minutes7);
  }, [teachers, filter]);

  const filteredStudents = useMemo(() => {
    const q = filter.toLowerCase();
    return students
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q))
      .sort((a, b) => b.minutes7 - a.minutes7);
  }, [students, filter]);

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin-Übersicht</h1>
          <p className="text-sm text-slate-500">
            Nutzung und Output aller Konten — Dauer, Inhalte, Lernerfolg.
          </p>
        </div>
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={GraduationCap} label="Lehrkräfte" value={String(stats.teachers)} color="text-sky-500" />
        <StatCard icon={Users} label="Schüler:innen" value={String(stats.students)} color="text-emerald-500" />
        <StatCard icon={Flame} label="heute aktiv" value={String(stats.activeToday)} color="text-amber-500" />
        <StatCard icon={Clock} label="Nutzung gesamt" value={fmtMinutes(stats.totalMinutes)} color="text-violet-500" />
        <StatCard icon={ClipboardList} label="Aufgaben" value={String(stats.totalTasks)} color="text-rose-500" />
        <StatCard icon={TrendingUp} label="Abgaben" value={String(stats.totalSubmissions)} color="text-cyan-500" />
      </div>

      {/* Tabs + Suche */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTab("teachers")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "teachers"
                ? "bg-white dark:bg-slate-900 shadow text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            👩‍🏫 Lehrkräfte ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("students")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "students"
                ? "bg-white dark:bg-slate-900 shadow text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            🎓 Schüler:innen ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("feedback")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition relative ${
              tab === "feedback"
                ? "bg-white dark:bg-slate-900 shadow text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            💡 Feedback ({feedback.length})
            {openFeedback > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {openFeedback}
              </span>
            )}
          </button>
        </div>
        {tab !== "feedback" && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Suchen…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {/* Lehrkräfte-Tabelle */}
      {tab === "teachers" && (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Lehrkraft</th>
                <th className="px-3 py-3 text-center" title="Erstellte Aufgaben (davon veröffentlicht)">
                  <ClipboardList className="w-4 h-4 inline" /> Aufgaben
                </th>
                <th className="px-3 py-3 text-center" title="Bibliotheks-Inhalte (Texte, Bilder, Dateien …)">
                  <Library className="w-4 h-4 inline" /> Bibliothek
                </th>
                <th className="px-3 py-3 text-center">Klassen</th>
                <th className="px-3 py-3 text-center" title="Nutzungsdauer letzte 7 Tage">
                  <Clock className="w-4 h-4 inline" /> 7 Tage
                </th>
                <th className="px-3 py-3 text-center">Gesamt</th>
                <th className="px-3 py-3 text-center">Aktive Tage</th>
                <th className="px-3 py-3 text-right">Zuletzt aktiv</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">Keine Treffer.</td></tr>
              )}
              {filteredTeachers.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.email}</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold">{t.tasksCreated}</span>
                    {t.tasksCreated > 0 && (
                      <span className="text-xs text-slate-500"> ({t.tasksPublished} veröff.)</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold">{t.libraryItems || "—"}</td>
                  <td className="px-3 py-3 text-center font-semibold">{t.classCount || "—"}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtMinutes(t.minutes7)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">{fmtMinutes(t.minutesTotal)}</td>
                  <td className="px-3 py-3 text-center text-slate-500">{t.activeDays || "—"}</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-500">{timeAgo(t.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Schüler-Tabelle */}
      {tab === "students" && (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Schüler:in</th>
                <th className="px-3 py-3 text-center">Abgaben</th>
                <th className="px-3 py-3 text-center" title="Durchschnittlicher Score über alle Abgaben">Ø Score</th>
                <th className="px-3 py-3 text-center" title="Abgaben mit 100%">
                  <Star className="w-4 h-4 inline" /> Perfekt
                </th>
                <th className="px-3 py-3 text-center">XP / Level</th>
                <th className="px-3 py-3 text-center" title="Streak-Tage">
                  <Flame className="w-4 h-4 inline" />
                </th>
                <th className="px-3 py-3 text-center" title="Nutzungsdauer letzte 7 Tage">
                  <Clock className="w-4 h-4 inline" /> 7 Tage
                </th>
                <th className="px-3 py-3 text-center">Gesamt</th>
                <th className="px-3 py-3 text-right">Zuletzt aktiv</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">Keine Treffer.</td></tr>
              )}
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.className}</div>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold">{s.submissions || "—"}</td>
                  <td className={`px-3 py-3 text-center font-bold ${scoreColor(s.avgScore)}`}>
                    {s.avgScore != null ? `${s.avgScore}%` : "—"}
                  </td>
                  <td className="px-3 py-3 text-center">{s.perfect || "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold">{s.xp}</span>
                    <span className="text-xs text-slate-500"> · Lvl {s.level}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {s.streak > 0 ? (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {s.streak}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{fmtMinutes(s.minutes7)}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">{fmtMinutes(s.minutesTotal)}</td>
                  <td className="px-3 py-3 text-right text-xs text-slate-500">{timeAgo(s.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Feedback-Bewertung */}
      {tab === "feedback" && <AdminFeedbackPanel items={feedback} />}

      {tab !== "feedback" && (
        <p className="text-xs text-slate-400">
          Nutzungsdauer = Minuten mit geöffnetem, sichtbarem App-Tab (1-Minuten-Auflösung).
          Erfasst seit Aktivierung des Trackings — ältere Aktivität erscheint nur unter „Zuletzt aktiv".
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="!p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <div className="text-xl font-bold truncate">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}
