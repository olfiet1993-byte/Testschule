"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  BookMarked, Library, Share2, Users, Search, Copy, ChevronDown, ChevronRight, X, Sparkles, Clock, Trash2,
} from "lucide-react";
import { DIFFICULTY_LABEL } from "@/components/DifficultySelect";
import { cloneTaskToClass, setTaskShared } from "@/lib/actions/curriculum";

type Unit = {
  id: string;
  parentId?: string | null;
  code?: string | null;
  title: string;
  schoolId?: string | null;
};
type Task = {
  id: string;
  classId: string;
  authorId: string;
  type: string;
  title: string;
  description?: string | null;
  curriculumUnitId?: string | null;
  difficulty?: number | null;
  examMode: boolean | number;
  createdAt: number | string;
};
type Author = { displayName: string; avatarEmoji?: string | null; avatarColor?: string | null };

const TYPE_EMOJI: Record<string, string> = {
  quiz: "❓",
  flashcards: "🃏",
  cloze: "✍️",
  case_study: "🏥",
  image_hotspot: "🖼️",
};

const TYPE_LABEL: Record<string, string> = {
  quiz: "Quiz",
  flashcards: "Karteikarten",
  cloze: "Lückentext",
  case_study: "Fallstudie",
  image_hotspot: "Bilderrätsel",
};

export function AustauschBoard({
  curriculum,
  sharedTasks,
  authorMap,
  classMap,
  myClasses,
  myUserId,
}: {
  curriculum: Unit[];
  sharedTasks: Task[];
  authorMap: Record<string, Author>;
  classMap: Record<string, string>;
  myClasses: { id: string; name: string }[];
  myUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(curriculum.filter((c) => !c.parentId).map((c) => c.id)));
  const [cloneFor, setCloneFor] = useState<Task | null>(null);
  const [cloneTarget, setCloneTarget] = useState<string>("");

  // Curriculum-Tree-Aufbau
  const childrenByParent = useMemo(() => {
    const m: Record<string, Unit[]> = {};
    for (const u of curriculum) {
      const k = u.parentId ?? "_root";
      if (!m[k]) m[k] = [];
      m[k].push(u);
    }
    for (const arr of Object.values(m)) {
      arr.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
    }
    return m;
  }, [curriculum]);
  const roots = childrenByParent["_root"] ?? [];

  // Anzahl Aufgaben pro Unit (inkl. Kinder)
  const taskCountByUnit = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of sharedTasks) {
      if (t.curriculumUnitId) counts[t.curriculumUnitId] = (counts[t.curriculumUnitId] ?? 0) + 1;
    }
    // Aggregiere für Eltern (Top-Level zählt sich + alle Kinder)
    for (const root of roots) {
      const kids = childrenByParent[root.id] ?? [];
      counts[root.id] = (counts[root.id] ?? 0) + kids.reduce((a, c) => a + (counts[c.id] ?? 0), 0);
    }
    return counts;
  }, [sharedTasks, roots, childrenByParent]);

  // Filter
  const filteredTasks = useMemo(() => {
    let arr = sharedTasks.slice();
    if (selectedUnit) {
      // Wenn Top-Level: Kinder einbeziehen
      const kids = childrenByParent[selectedUnit] ?? [];
      const ids = new Set<string>([selectedUnit, ...kids.map((k) => k.id)]);
      arr = arr.filter((t) => t.curriculumUnitId && ids.has(t.curriculumUnitId));
    }
    if (typeFilter) arr = arr.filter((t) => t.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
  }, [sharedTasks, selectedUnit, typeFilter, search, childrenByParent]);

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function doClone(targetClassId: string) {
    if (!cloneFor) return;
    start(async () => {
      try {
        await cloneTaskToClass({ sourceTaskId: cloneFor.id, targetClassId, publish: false });
        setCloneFor(null);
        setCloneTarget("");
        router.refresh();
        alert('In deine Klasse kopiert (als Entwurf). Du findest sie unter "Aufgaben".');
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function unshare(taskId: string) {
    if (!confirm("Diese Aufgabe aus dem Austausch entfernen? Andere können sie dann nicht mehr kopieren.")) return;
    start(async () => {
      try {
        await setTaskShared({ taskId, shared: false });
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Austausch-Pool</h1>
            <p className="text-sm text-slate-500">
              Aufgaben aller Lehrkräfte deiner Schule — geordnet nach Pflege-Lehrplan (PflAPrV).
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">
          {sharedTasks.length} geteilte Aufgaben · {Object.keys(authorMap).length} beteiligte Lehrkräfte
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Lehrplan-Tree */}
        <aside className="space-y-2">
          <Card className="!p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <BookMarked className="w-3.5 h-3.5" /> Pflege-Lehrplan
            </div>
            <button
              type="button"
              onClick={() => setSelectedUnit(null)}
              className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition mb-1 ${
                selectedUnit == null
                  ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Alle Themen ({sharedTasks.length})
            </button>
            <ul className="space-y-0.5">
              {roots.map((root) => {
                const kids = childrenByParent[root.id] ?? [];
                const open = expanded.has(root.id);
                const count = taskCountByUnit[root.id] ?? 0;
                return (
                  <li key={root.id}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggle(root.id)}
                        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                      >
                        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUnit(root.id)}
                        className={`flex-1 text-left text-sm px-2 py-1 rounded-md transition ${
                          selectedUnit === root.id
                            ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-violet-600 font-mono text-xs mr-1">{root.code}</span>
                        {root.title}
                        {count > 0 && <span className="ml-1 text-slate-400">({count})</span>}
                      </button>
                    </div>
                    {open && kids.length > 0 && (
                      <ul className="ml-5 mt-1 space-y-0.5">
                        {kids.map((c) => {
                          const cCount = taskCountByUnit[c.id] ?? 0;
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedUnit(c.id)}
                                className={`w-full text-left text-xs px-2 py-1 rounded-md transition ${
                                  selectedUnit === c.id
                                    ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                <span className="text-violet-500 font-mono mr-1">{c.code}</span>
                                {c.title}
                                {cCount > 0 && <span className="ml-1 text-slate-400">({cCount})</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>

        {/* Aufgaben-Liste */}
        <main className="space-y-3">
          {/* Filter-Leiste */}
          <Card className="!p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTypeFilter(null)}
                  className={`text-xs px-2.5 py-1 rounded-full ${typeFilter == null ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  Alle
                </button>
                {Object.entries(TYPE_LABEL).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTypeFilter(k === typeFilter ? null : k)}
                    className={`text-xs px-2.5 py-1 rounded-full ${typeFilter === k ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}
                  >
                    {TYPE_EMOJI[k]} {l}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {filteredTasks.length === 0 ? (
            <Card className="text-center py-12">
              <Library className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">
                {sharedTasks.length === 0
                  ? "Noch keine Aufgaben im Austausch."
                  : "Keine Aufgaben gefunden für diese Auswahl."}
              </p>
              {sharedTasks.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Markiere deine Aufgaben als „Im Schul-Austausch teilen" im Editor.
                </p>
              )}
            </Card>
          ) : (
            <ul className="space-y-2">
              {filteredTasks.map((t) => {
                const author = authorMap[t.authorId];
                const unit = curriculum.find((u) => u.id === t.curriculumUnitId);
                const isMine = t.authorId === myUserId;
                const diff = t.difficulty ? DIFFICULTY_LABEL[t.difficulty] : null;
                return (
                  <li key={t.id}>
                    <Card className="!p-4 hover-lift">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800">
                              {TYPE_EMOJI[t.type]} {TYPE_LABEL[t.type] ?? t.type}
                            </Badge>
                            {diff && <Badge className={diff.color}>{diff.label}</Badge>}
                            {t.examMode && <Badge className="bg-rose-100 text-rose-700">Klausur</Badge>}
                            {unit && (
                              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                <BookMarked className="w-3 h-3" />
                                {unit.code} · {unit.title}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{t.title}</h3>
                          {t.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-2 flex-wrap">
                            <span style={{ color: author?.avatarColor ?? undefined }}>
                              {author?.avatarEmoji ?? "👤"} {author?.displayName ?? "Unbekannt"}
                              {isMine && <span className="ml-1 text-emerald-600">(du)</span>}
                            </span>
                            <span>·</span>
                            <span>{classMap[t.classId] ?? "?"}</span>
                            <span>·</span>
                            <Clock className="w-3 h-3 inline" /> {new Date(t.createdAt).toLocaleDateString("de-DE")}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {isMine ? (
                            <Button size="sm" variant="ghost" onClick={() => unshare(t.id)} disabled={pending} className="!text-rose-600">
                              <Trash2 className="w-3 h-3" /> Aus Austausch
                            </Button>
                          ) : (
                            <Button size="sm" variant="brand" onClick={() => setCloneFor(t)} disabled={pending}>
                              <Copy className="w-3 h-3" /> Übernehmen
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>

      {/* Klon-Dialog */}
      {cloneFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md !p-5 shadow-lift">
            <div className="flex items-center gap-2 mb-3">
              <Copy className="w-5 h-5 text-sky-500" />
              <h3 className="font-semibold">In Klasse kopieren</h3>
              <button onClick={() => { setCloneFor(null); setCloneTarget(""); }} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Du übernimmst <strong>„{cloneFor.title}"</strong> in deine Klasse. Sie wird als <strong>Entwurf</strong> angelegt — du kannst sie anpassen und dann veröffentlichen.
            </p>
            <div className="space-y-3">
              <select
                value={cloneTarget}
                onChange={(e) => setCloneTarget(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
              >
                <option value="">— Zielklasse wählen —</option>
                {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-2 pt-1">
                <Button onClick={() => doClone(cloneTarget)} disabled={!cloneTarget || pending} variant="brand" className="flex-1">
                  <Sparkles className="w-4 h-4" /> {pending ? "Kopiere…" : "Übernehmen"}
                </Button>
                <Button variant="secondary" onClick={() => { setCloneFor(null); setCloneTarget(""); }} disabled={pending}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
