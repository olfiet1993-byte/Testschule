"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClozeTask, updateTask } from "@/lib/actions/tasks";
import { TopicSelect } from "@/components/TopicSelect";
import { ExamModeSection } from "@/components/ExamModeSection";
import { DifficultySelect } from "@/components/DifficultySelect";
import { Plus, Trash2, Info, Sparkles } from "lucide-react";
import { AutoCardPanel } from "@/components/AutoCardPanel";
import { suggestFromCloze } from "@/lib/cardSuggester";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { CurriculumSelect, ShareToggle } from "@/components/CurriculumSelect";
import { generateClozeAlternatives } from "@/lib/actions/aiTaskGen";

type Blank = { index: number; answers: string[]; caseSensitive?: boolean };

// Parser: findet alle {{...}}-Platzhalter im Text und gibt die Lückenanzahl zurück.
function parseBlanks(text: string): number {
  const matches = text.match(/\{\{[^}]*\}\}/g);
  return matches ? matches.length : 0;
}

// Hilfsfunktion: ersetzt {{...}}-Platzhalter durch [1], [2], ... für die Preview.
function previewText(text: string): string {
  let i = 0;
  return text.replace(/\{\{[^}]*\}\}/g, () => `[${++i}]`);
}

export function ClozeEditor({ classes, topics, curriculum = [], task }: { classes: any[]; topics: any[]; curriculum?: any[]; task?: any }) {
  const initialPayload = task ? JSON.parse(task.payload) : null;
  const [pending, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [classId, setClassId] = useState(task?.classId ?? classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(task?.topicId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 15);
  const [text, setText] = useState<string>(
    initialPayload?.text ??
      "Der normale Puls in Ruhe liegt zwischen {{60}} und {{100}} Schlägen pro Minute.\n\n" +
      "Ab einem Blutdruck von {{140/90}} mmHg spricht man von einer {{Hypertonie}}."
  );
  const [blanks, setBlanks] = useState<Blank[]>(initialPayload?.blanks ?? []);
  const [examMode, setExamMode] = useState<boolean>(!!task?.examMode);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(task?.timeLimitMinutes ?? null);
  const [difficulty, setDifficulty] = useState<number | null>(task?.difficulty ?? null);
  const [curriculumUnitId, setCurriculumUnitId] = useState<string | null>(task?.curriculumUnitId ?? null);
  const [sharedInSchool, setSharedInSchool] = useState<boolean>(!!task?.sharedInSchool);
  const isEdit = !!task;
  const [aiGenerated, setAiGenerated] = useState(false);

  const blankCount = parseBlanks(text);

  // Initial-Befüllung: aus den {{...}}-Werten Antworten extrahieren
  useMemo(() => {
    const matches = Array.from(text.matchAll(/\{\{([^}]*)\}\}/g));
    setBlanks((prev) =>
      matches.map((m, i) => {
        const existing = prev.find((b) => b.index === i);
        const auto = m[1].trim();
        return existing
          ? existing
          : { index: i, answers: auto ? [auto] : [""], caseSensitive: false };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function updateBlank(i: number, patch: Partial<Blank>) {
    setBlanks((bs) => bs.map((b) => (b.index === i ? { ...b, ...patch } : b)));
  }
  function addAlternative(i: number) {
    setBlanks((bs) =>
      bs.map((b) => (b.index === i ? { ...b, answers: [...b.answers, ""] } : b))
    );
  }
  function removeAlternative(i: number, ai: number) {
    setBlanks((bs) =>
      bs.map((b) =>
        b.index === i ? { ...b, answers: b.answers.filter((_, j) => j !== ai) } : b
      )
    );
  }

  const [aiBusyBlank, setAiBusyBlank] = useState<number | null>(null);

  async function suggestAlternatives(blankIndex: number) {
    const blank = blanks.find((b) => b.index === blankIndex);
    if (!blank) return;
    const primary = blank.answers[0]?.trim();
    if (!primary) return alert("Erst die Hauptantwort eintragen");
    // Den Satz mit der Lücke extrahieren
    const matches = Array.from(text.matchAll(/[^.!?\n]*\{\{[^}]*\}\}[^.!?\n]*/g));
    const sentence = matches[blankIndex]?.[0] ?? text;
    setAiBusyBlank(blankIndex);
    try {
      const { alternatives } = await generateClozeAlternatives({
        sentence: sentence.replace(/\{\{[^}]*\}\}/g, "____"),
        primaryAnswer: primary,
        existing: blank.answers.slice(1),
        count: 3,
      });
      const fresh = (Array.isArray(alternatives) ? alternatives : [])
        .map((s) => String(s).trim())
        .filter((s) => s && !blank.answers.some((a) => a.toLowerCase() === s.toLowerCase()));
      if (fresh.length === 0) throw new Error("Keine neuen Vorschläge");
      setBlanks((bs) =>
        bs.map((b) => (b.index === blankIndex ? { ...b, answers: [...b.answers, ...fresh] } : b)),
      );
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    } finally {
      setAiBusyBlank(null);
    }
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    if (blankCount === 0) return alert("Text enthält keine Lücken — mit {{Antwort}} markieren");
    const cleaned = blanks.map((b) => ({
      ...b,
      answers: b.answers.map((a) => a.trim()).filter(Boolean),
    }));
    if (cleaned.some((b) => b.answers.length === 0))
      return alert("Jede Lücke braucht mindestens eine richtige Antwort");
    try {
      if (isEdit) {
        await updateTask({
          taskId: task.id, title, description, classId, xpReward, topicId,
          payload: { text, blanks: cleaned },
          examMode, timeLimitMinutes, difficulty,
          curriculumUnitId, sharedInSchool,
        });
      } else {
        await createClozeTask({
          classId, topicId, title, description, xpReward, text, blanks: cleaned, publish,
          examMode, timeLimitMinutes, difficulty,
          curriculumUnitId, sharedInSchool, aiGenerated,
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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Vitalwerte – Lückentext" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classId">Klasse</Label>
            <select id="classId" value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Beschreibung (optional)</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="xp">XP-Belohnung</Label>
            <Input id="xp" type="number" min={5} max={200} value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <TopicSelect topics={topics} classId={classId} value={topicId} onChange={setTopicId} />
          </div>
          <DifficultySelect value={difficulty} onChange={setDifficulty} />
        </div>
      </Card>

      <ExamModeSection
        examMode={examMode}
        setExamMode={setExamMode}
        timeLimitMinutes={timeLimitMinutes}
        setTimeLimitMinutes={setTimeLimitMinutes}
      />

      <Card>
        <CurriculumSelect units={curriculum} value={curriculumUnitId} onChange={setCurriculumUnitId} taskTitle={title} taskDescription={description} />
        <div className="mt-3">
          <ShareToggle shared={sharedInSchool} onChange={setSharedInSchool} />
        </div>
      </Card>

      <div className="flex justify-end">
        <AiGenerateButton
          type="cloze"
          defaultTopic={title}
          onResult={(r) => {
            if (r?.text) setText(String(r.text));
            if (Array.isArray(r?.blanks)) {
              setBlanks(r.blanks.map((b: any, i: number) => ({
                index: i,
                answers: Array.isArray(b.answers) ? b.answers.map(String) : [""],
                caseSensitive: !!b.caseSensitive,
              })));
            }
            if (r?.text || r?.blanks) setAiGenerated(true);
          }}
        />
      </div>

      <Card>
        <Label htmlFor="text">Text</Label>
        <p className="text-xs text-slate-500 mt-1 mb-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Setze Lücken mit doppelten geschweiften Klammern: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{`{{Antwort}}`}</code>
        </p>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-mono"
        />
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="text-xs font-semibold text-slate-500 mb-1">Vorschau für Schüler</div>
          <div className="text-sm whitespace-pre-wrap">{previewText(text)}</div>
        </div>
      </Card>

      {blankCount > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Lücken ({blankCount})</h3>
          </div>
          <div className="space-y-3">
            {blanks.map((b, i) => (
              <div key={b.index} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold text-slate-500 mb-2">Lücke [{i + 1}] · akzeptierte Antworten</div>
                {b.answers.map((a, ai) => (
                  <div key={ai} className="flex items-center gap-2 mb-2">
                    <Input
                      value={a}
                      onChange={(e) => {
                        const next = [...b.answers];
                        next[ai] = e.target.value;
                        updateBlank(b.index, { answers: next });
                      }}
                      placeholder={ai === 0 ? "Richtige Antwort" : "Alternative / Synonym"}
                      className="flex-1"
                    />
                    {b.answers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAlternative(b.index, ai)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addAlternative(b.index)}
                      className="text-xs text-sky-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Alternative
                    </button>
                    <button
                      type="button"
                      onClick={() => suggestAlternatives(b.index)}
                      disabled={aiBusyBlank !== null}
                      className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 disabled:opacity-50 transition"
                      title="KI schlägt Synonyme & alternative Schreibweisen vor"
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiBusyBlank === b.index ? "Denke…" : "Synonyme"}
                    </button>
                  </div>
                  <label className="text-xs text-slate-500 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!b.caseSensitive}
                      onChange={(e) => updateBlank(b.index, { caseSensitive: e.target.checked })}
                    />
                    Groß-/Kleinschreibung beachten
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          deckName={(title || "Lückentext") + " — Karteikarten"}
          suggestions={suggestFromCloze(text, blanks)}
        />
      )}
    </div>
  );
}
