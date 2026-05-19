"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createFlashcardTask, updateTask } from "@/lib/actions/tasks";
import { TopicSelect } from "@/components/TopicSelect";
import { Plus, Trash2, BookOpen, Sparkles, X } from "lucide-react";
import { AutoCardPanel } from "@/components/AutoCardPanel";
import { suggestFromFlashcards } from "@/lib/cardSuggester";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { CurriculumSelect, ShareToggle } from "@/components/CurriculumSelect";

type CardItem = { front: string; back: string };
const blank = (): CardItem => ({ front: "", back: "" });

export function FlashcardEditor({ classes, library, topics, curriculum = [], task }: { classes: any[]; library: any[]; topics: any[]; curriculum?: any[]; task?: any }) {
  const initialPayload = task ? JSON.parse(task.payload) : null;
  const [pending, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [classId, setClassId] = useState(task?.classId ?? classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(task?.topicId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 15);
  const [cards, setCards] = useState<CardItem[]>(initialPayload?.cards ?? [blank()]);
  const [importOpen, setImportOpen] = useState(false);
  const [curriculumUnitId, setCurriculumUnitId] = useState<string | null>(task?.curriculumUnitId ?? null);
  const [sharedInSchool, setSharedInSchool] = useState<boolean>(!!task?.sharedInSchool);
  const isEdit = !!task;

  const terms = useMemo(() => library.filter((l) => l.type === "term"), [library]);

  function update(i: number, patch: Partial<CardItem>) {
    setCards((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function importTerm(term: any) {
    setCards((cs) => {
      const next = cs.filter((c) => c.front.trim() || c.back.trim());
      next.push({ front: term.title, back: term.body ?? "" });
      return next.length === 0 ? [blank()] : next;
    });
    setImportOpen(false);
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    const cleaned = cards.filter((c) => c.front.trim() && c.back.trim());
    if (cleaned.length === 0) return alert("Mindestens eine vollständige Karte");
    try {
      if (isEdit) {
        await updateTask({
          taskId: task.id, title, description, classId, xpReward, topicId,
          payload: { cards: cleaned },
          curriculumUnitId, sharedInSchool,
        });
      } else {
        await createFlashcardTask({
          classId, topicId, title, description, xpReward, cards: cleaned, publish,
          curriculumUnitId, sharedInSchool,
        });
      }
      router.push("/aufgaben");
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="title">Titel</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Fachbegriffe – Vitalwerte" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classId">Klasse</Label>
            <select
              id="classId"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Kurze Beschreibung (optional)</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="xp">XP-Belohnung</Label>
            <Input id="xp" type="number" min={5} max={200} value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))} className="mt-1" />
          </div>
          <div className="md:col-span-3">
            <TopicSelect topics={topics} classId={classId} value={topicId} onChange={setTopicId} />
          </div>
        </div>
      </Card>

      {terms.length > 0 && (
        <Card className="bg-violet-50/30 dark:bg-violet-900/10 border-violet-200 dark:border-violet-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm">
                <strong>{terms.length} Begriffe</strong> in der Bibliothek — direkt als Karten importieren.
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
              <BookOpen className="w-4 h-4" /> Aus Bibliothek
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CurriculumSelect units={curriculum} value={curriculumUnitId} onChange={setCurriculumUnitId} taskTitle={title} taskDescription={description} />
        <div className="mt-3">
          <ShareToggle shared={sharedInSchool} onChange={setSharedInSchool} />
        </div>
      </Card>

      <div className="flex justify-end">
        <AiGenerateButton
          type="flashcards"
          defaultTopic={title}
          onResult={(r) => {
            if (Array.isArray(r?.cards)) {
              setCards(r.cards.map((c: any) => ({
                front: String(c.front ?? ""),
                back: String(c.back ?? ""),
              })));
            }
          }}
        />
      </div>

      <div className="space-y-3">
        {cards.map((c, i) => (
          <Card key={i} className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Karte {i + 1}</span>
              {cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCards((cs) => cs.filter((_, idx) => idx !== i))}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vorderseite (Frage/Begriff)</Label>
                <textarea
                  value={c.front}
                  onChange={(e) => update(i, { front: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                  placeholder="z. B. Tachykardie"
                />
              </div>
              <div>
                <Label className="text-xs">Rückseite (Antwort/Definition)</Label>
                <textarea
                  value={c.back}
                  onChange={(e) => update(i, { back: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                  placeholder="z. B. Herzfrequenz > 100/min in Ruhe"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={() => setCards((cs) => [...cs, blank()])} className="w-full">
        <Plus className="w-4 h-4" /> Weitere Karte
      </Button>

      <div className="flex gap-2 sticky bottom-4">
        {isEdit ? (
          <Button onClick={() => submit(false)} disabled={pending} className="flex-1">
            Änderungen speichern
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => submit(false)} disabled={pending} className="flex-1">Als Entwurf</Button>
            <Button onClick={() => submit(true)} disabled={pending} className="flex-1">Speichern & veröffentlichen</Button>
          </>
        )}
      </div>

      {classId && (
        <AutoCardPanel
          classId={classId}
          topicId={topicId}
          taskId={task?.id ?? null}
          deckName={(title || "Karteikarten") + " — Lernstapel"}
          suggestions={suggestFromFlashcards(cards)}
        />
      )}

      {importOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Begriffe importieren</h3>
              <button onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              Klicke einen Begriff an, um ihn als Karteikarte zu übernehmen (Front = Titel, Back = Definition).
            </p>
            <div className="space-y-2">
              {terms.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => importTerm(t)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                >
                  <div className="font-semibold text-sm">{t.title}</div>
                  <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{t.body}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
