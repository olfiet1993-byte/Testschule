"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  addPathItem,
  removePathItem,
  movePathItem,
  updateLearningPath,
  deleteLearningPath,
  autoFillLearningPath,
} from "@/lib/actions/learningPaths";
import { DIFFICULTY_LABEL } from "@/components/DifficultySelect";
import { Plus, Trash2, ArrowRight, Sparkles, Archive, Save, Calendar, Map } from "lucide-react";

type Item = { id: string; weekIndex: number; taskId: string; order: number; note?: string | null };
type Task = { id: string; title: string; type: string; topicId?: string | null; difficulty?: number | null; published: any };
type Path = {
  id: string;
  classId: string;
  name: string;
  description?: string | null;
  startsOn: string;
  numWeeks: number;
  topicId?: string | null;
  archived: boolean;
};

const TYPE_EMOJI: Record<string, string> = {
  quiz: "❓",
  flashcards: "🃏",
  cloze: "✍️",
  case: "🏥",
  image_hotspot: "🖼️",
};

export function LernpfadEditor({
  classId,
  path,
  items: initialItems,
  tasks,
  topics,
}: {
  classId: string;
  path: Path;
  items: Item[];
  tasks: Task[];
  topics: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [name, setName] = useState(path.name);
  const [description, setDescription] = useState(path.description ?? "");
  const [startsOn, setStartsOn] = useState(path.startsOn);
  const [numWeeks, setNumWeeks] = useState(path.numWeeks);
  const [archived, setArchived] = useState(path.archived);
  const [addingForWeek, setAddingForWeek] = useState<number | null>(null);
  const [chosenTaskId, setChosenTaskId] = useState<string>("");

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);
  const topicTitleById = useMemo(() => Object.fromEntries(topics.map((t: any) => [t.id, t.title])), [topics]);

  const itemsByWeek = useMemo(() => {
    const m: Record<number, Item[]> = {};
    for (const it of items) {
      if (!m[it.weekIndex]) m[it.weekIndex] = [];
      m[it.weekIndex].push(it);
    }
    return m;
  }, [items]);

  const weekStartDate = (w: number) => {
    const d = new Date(path.startsOn + "T00:00:00");
    d.setDate(d.getDate() + (w - 1) * 7);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  function currentWeek(): number | null {
    const start = new Date(path.startsOn + "T00:00:00");
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    const w = Math.floor(diffDays / 7) + 1;
    if (w > path.numWeeks) return null;
    return w;
  }
  const curWeek = currentWeek();

  async function saveMeta() {
    start(async () => {
      try {
        await updateLearningPath({
          pathId: path.id,
          name,
          description,
          startsOn,
          numWeeks,
          archived,
        });
        router.refresh();
        alert("Gespeichert");
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function addItem(weekIndex: number, taskId: string) {
    start(async () => {
      try {
        await addPathItem({ pathId: path.id, weekIndex, taskId });
        // Optimistisch: lokal nachladen
        router.refresh();
        // Lokal anhängen (UI direkt aktualisieren)
        setItems((prev) => [
          ...prev,
          {
            id: `tmp-${Date.now()}`,
            weekIndex,
            taskId,
            order: 999,
          },
        ]);
        setAddingForWeek(null);
        setChosenTaskId("");
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function removeItem(itemId: string) {
    if (!confirm("Aufgabe aus dem Lernpfad entfernen?")) return;
    start(async () => {
      try {
        await removePathItem(itemId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function moveItem(itemId: string, toWeek: number) {
    start(async () => {
      try {
        await movePathItem({ itemId, toWeek });
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, weekIndex: toWeek } : i)));
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function regenerate() {
    if (!confirm("Alle bestehenden Einträge ersetzen und Aufgaben neu verteilen?")) return;
    start(async () => {
      try {
        const res = await autoFillLearningPath({
          pathId: path.id,
          fromTopicId: path.topicId ?? null,
          onlyPublished: true,
        });
        alert(`${res.added} Aufgaben verteilt`);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function doDelete() {
    if (!confirm("Lernpfad endgültig löschen? Aufgaben bleiben erhalten.")) return;
    start(async () => {
      try {
        await deleteLearningPath(path.id);
        router.push(`/klassen/${classId}/lernpfade`);
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  // Aufgaben, die noch nicht im Pfad sind (für Add-Dropdown)
  const usedTaskIds = new Set(items.map((i) => i.taskId));
  const availableTasks = tasks.filter((t) => !usedTaskIds.has(t.id));

  return (
    <div className="space-y-6">
      {/* Kopf-Card mit Metadaten */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Map className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{name || path.name}</h1>
            <p className="text-xs text-slate-500">
              Start: {path.startsOn} · {numWeeks} Wochen · {items.length} Aufgaben
              {curWeek && <> · <span className="text-emerald-600 font-semibold">aktuell Woche {curWeek}</span></>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label htmlFor="pname">Titel</Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pweeks">Wochen</Label>
            <Input id="pweeks" type="number" min={1} max={26} value={numWeeks}
              onChange={(e) => setNumWeeks(Number(e.target.value))} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="pdesc">Beschreibung</Label>
            <Input id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pstart">Startdatum</Label>
            <Input id="pstart" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            <Archive className="w-4 h-4" /> Archiviert
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={regenerate} disabled={pending}>
              <Sparkles className="w-4 h-4" /> Auto-Verteilung
            </Button>
            <Button onClick={saveMeta} disabled={pending}>
              <Save className="w-4 h-4" /> Speichern
            </Button>
          </div>
        </div>
      </Card>

      {/* Wochen-Spalten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: numWeeks }, (_, i) => i + 1).map((w) => {
          const ws = itemsByWeek[w] ?? [];
          const isCurrent = curWeek === w;
          return (
            <Card key={w} className={isCurrent ? "border-emerald-300 bg-emerald-50/30 dark:bg-emerald-900/10" : ""}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">Woche {w}</h3>
                  <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ab {weekStartDate(w)}
                  </div>
                </div>
                {isCurrent && <Badge className="bg-emerald-500 text-white text-[10px]">aktuell</Badge>}
              </div>

              <ul className="space-y-2 mb-3">
                {ws.length === 0 && (
                  <li className="text-xs text-slate-400 italic">Noch keine Aufgaben</li>
                )}
                {ws.map((it) => {
                  const t = taskById[it.taskId];
                  if (!t) return null;
                  const diff = t.difficulty ? DIFFICULTY_LABEL[t.difficulty] : null;
                  return (
                    <li key={it.id} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{TYPE_EMOJI[t.type] ?? "📝"} {t.title}</div>
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {t.topicId && topicTitleById[t.topicId] && (
                              <span className="text-[10px] text-violet-600">{topicTitleById[t.topicId]}</span>
                            )}
                            {diff && <Badge className={`text-[10px] ${diff.color}`}>{diff.label}</Badge>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="text-slate-400 hover:text-rose-500 flex-shrink-0"
                          title="Entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Move-To */}
                      <select
                        value={it.weekIndex}
                        onChange={(e) => moveItem(it.id, Number(e.target.value))}
                        className="mt-1 text-[10px] px-1 py-0.5 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        title="In andere Woche verschieben"
                      >
                        {Array.from({ length: numWeeks }, (_, i) => i + 1).map((wi) => (
                          <option key={wi} value={wi}>Woche {wi}</option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>

              {addingForWeek === w ? (
                <div className="space-y-2">
                  <select
                    value={chosenTaskId}
                    onChange={(e) => setChosenTaskId(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  >
                    <option value="">— Aufgabe wählen —</option>
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {TYPE_EMOJI[t.type] ?? ""} {t.title}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => chosenTaskId && addItem(w, chosenTaskId)}
                      disabled={!chosenTaskId || pending}
                      className="flex-1"
                    >
                      Hinzufügen
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setAddingForWeek(null); setChosenTaskId(""); }}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingForWeek(w)}
                  className="w-full text-xs text-sky-600 hover:underline inline-flex items-center justify-center gap-1 py-1 rounded border border-dashed border-slate-300 dark:border-slate-700"
                >
                  <Plus className="w-3 h-3" /> Aufgabe hinzufügen
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Lösch-Aktion */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-rose-600">Gefahrenzone</h4>
            <p className="text-xs text-slate-500">Lernpfad löschen — die enthaltenen Aufgaben bleiben erhalten.</p>
          </div>
          <Button variant="secondary" onClick={doDelete} disabled={pending} className="!text-rose-600">
            <Trash2 className="w-4 h-4" /> Löschen
          </Button>
        </div>
      </Card>
    </div>
  );
}
