"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createQuizTask, updateTask } from "@/lib/actions/tasks";
import { TopicSelect } from "@/components/TopicSelect";
import { ExamModeSection } from "@/components/ExamModeSection";
import { DifficultySelect } from "@/components/DifficultySelect";
import { Plus, Trash2, Check, Sparkles, Wand2 } from "lucide-react";
import { AutoCardPanel } from "@/components/AutoCardPanel";
import { suggestFromQuiz } from "@/lib/cardSuggester";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { CurriculumSelect, ShareToggle } from "@/components/CurriculumSelect";
import { generateDistractors, generateExplanation } from "@/lib/actions/aiTaskGen";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

const blankQuestion = (): Question => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

export function QuizEditor({ classes, topics, curriculum = [], task }: { classes: any[]; topics: any[]; curriculum?: any[]; task?: any }) {
  const initialPayload = task ? JSON.parse(task.payload) : null;
  const [pending, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [classId, setClassId] = useState(task?.classId ?? classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(task?.topicId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 20);
  const [questions, setQuestions] = useState<Question[]>(
    initialPayload?.questions ?? [blankQuestion()]
  );
  const [examMode, setExamMode] = useState<boolean>(!!task?.examMode);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(task?.timeLimitMinutes ?? null);
  const [difficulty, setDifficulty] = useState<number | null>(task?.difficulty ?? null);
  const [curriculumUnitId, setCurriculumUnitId] = useState<string | null>(task?.curriculumUnitId ?? null);
  const [sharedInSchool, setSharedInSchool] = useState<boolean>(!!task?.sharedInSchool);
  const isEdit = !!task;
  const [aiGenerated, setAiGenerated] = useState(false);

  function updateQ(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    );
  }

  // Pro-Frage-KI-Hilfen
  const [aiBusy, setAiBusy] = useState<{ qi: number; kind: "distractors" | "explanation" } | null>(null);

  async function suggestDistractors(qi: number) {
    const q = questions[qi];
    if (!q.question.trim()) return alert("Erst die Frage formulieren");
    const correct = q.options[q.correctIndex];
    if (!correct?.trim()) return alert("Erst die richtige Antwort eintragen");
    setAiBusy({ qi, kind: "distractors" });
    try {
      // Bestehende falsche Antworten (nicht doppeln lassen)
      const existing = q.options.filter((_, i) => i !== q.correctIndex).filter((s) => s.trim());
      const { distractors } = await generateDistractors({
        question: q.question,
        correctAnswer: correct,
        existing,
        count: 3,
      });
      const items = (Array.isArray(distractors) ? distractors : []).map((s) => String(s).trim()).filter(Boolean);
      if (items.length === 0) throw new Error("KI hat keine Vorschläge geliefert");
      // In leere Slots einfüllen; ggf. weitere Optionen anhängen (max 6)
      setQuestions((qs) =>
        qs.map((qq, idx) => {
          if (idx !== qi) return qq;
          const opts = [...qq.options];
          for (const d of items) {
            // erstes leeres, nicht-korrektes Slot finden
            const emptyIdx = opts.findIndex((s, i) => i !== qq.correctIndex && !s.trim());
            if (emptyIdx !== -1) {
              opts[emptyIdx] = d;
            } else if (opts.length < 6) {
              opts.push(d);
            }
          }
          return { ...qq, options: opts };
        }),
      );
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    } finally {
      setAiBusy(null);
    }
  }

  async function suggestExplanation(qi: number) {
    const q = questions[qi];
    if (!q.question.trim()) return alert("Erst die Frage formulieren");
    const correct = q.options[q.correctIndex];
    if (!correct?.trim()) return alert("Erst die richtige Antwort eintragen");
    setAiBusy({ qi, kind: "explanation" });
    try {
      const { explanation } = await generateExplanation({
        question: q.question,
        correctAnswer: correct,
      });
      if (!explanation) throw new Error("Keine Erklärung erhalten");
      updateQ(qi, { explanation: String(explanation).trim() });
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    } finally {
      setAiBusy(null);
    }
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    try {
      if (isEdit) {
        await updateTask({
          taskId: task.id,
          title, description, classId, xpReward, topicId,
          payload: { questions },
          examMode, timeLimitMinutes, difficulty, curriculumUnitId, sharedInSchool,
        });
      } else {
        await createQuizTask({
          classId, topicId, title, description, xpReward, questions, publish,
          examMode, timeLimitMinutes, difficulty, curriculumUnitId, sharedInSchool,
          aiGenerated,
        });
      }
      router.push(`/aufgaben`);
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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Vitalwerte – Grundlagen" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classId">Klasse</Label>
            <select
              id="classId"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Kurze Beschreibung (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wofür ist diese Aufgabe gedacht?"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="xp">XP-Belohnung</Label>
            <Input id="xp" type="number" min={5} max={200} value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} className="mt-1" />
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
          type="quiz"
          defaultTopic={title}
          onResult={(r) => {
            if (Array.isArray(r?.questions)) {
              setQuestions(r.questions.map((q: any) => ({
                question: String(q.question ?? ""),
                options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : ["", "", "", ""],
                correctIndex: Math.max(0, Math.min(Number(q.correctIndex ?? 0), (q.options?.length ?? 1) - 1)),
                explanation: q.explanation ? String(q.explanation) : "",
              })));
              setAiGenerated(true); // ← Review-Pflicht aktivieren
            }
          }}
        />
      </div>

      {questions.map((q, qi) => (
        <Card key={qi}>
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500">Frage {qi + 1}</div>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                className="text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <textarea
            value={q.question}
            onChange={(e) => updateQ(qi, { question: e.target.value })}
            placeholder="Frage eingeben…"
            rows={2}
            className="w-full px-3 py-2 mb-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-medium"
          />

          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQ(qi, { correctIndex: oi })}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                    q.correctIndex === oi
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                  title="Als richtige Antwort markieren"
                >
                  {q.correctIndex === oi && <Check className="w-4 h-4" />}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Antwort ${oi + 1}…`}
                  className={q.correctIndex === oi ? "border-emerald-300" : ""}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = q.options.filter((_, j) => j !== oi);
                      const newCorrect = q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
                      updateQ(qi, { options: newOptions, correctIndex: newCorrect });
                    }}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-3 flex-wrap">
              {q.options.length < 6 && (
                <button
                  type="button"
                  onClick={() => updateQ(qi, { options: [...q.options, ""] })}
                  className="text-sm text-sky-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Antwortmöglichkeit
                </button>
              )}
              <button
                type="button"
                onClick={() => suggestDistractors(qi)}
                disabled={!!aiBusy}
                className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 disabled:opacity-50 transition"
                title="KI schlägt 3 plausible Falsch-Antworten vor"
              >
                <Sparkles className="w-3 h-3" />
                {aiBusy?.qi === qi && aiBusy?.kind === "distractors" ? "Denke…" : "Falsche Antworten"}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Erklärung (zeigt sich nach der Abgabe)</Label>
              <button
                type="button"
                onClick={() => suggestExplanation(qi)}
                disabled={!!aiBusy}
                className="text-xs inline-flex items-center gap-1 text-violet-600 hover:underline disabled:opacity-50"
                title="KI schlägt eine kurze pädagogische Erklärung vor"
              >
                <Sparkles className="w-3 h-3" />
                {aiBusy?.qi === qi && aiBusy?.kind === "explanation" ? "Denke…" : "KI-Vorschlag"}
              </button>
            </div>
            <Input
              value={q.explanation ?? ""}
              onChange={(e) => updateQ(qi, { explanation: e.target.value })}
              placeholder="Optional — warum ist diese Antwort richtig?"
              className="mt-1"
            />
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
        className="w-full"
      >
        <Plus className="w-4 h-4" /> Weitere Frage
      </Button>

      <div className="flex gap-2 sticky bottom-4">
        {isEdit ? (
          <Button onClick={() => submit(false)} disabled={pending} className="flex-1">
            Änderungen speichern
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => submit(false)} disabled={pending} className="flex-1">
              Als Entwurf speichern
            </Button>
            <Button onClick={() => submit(true)} disabled={pending} className="flex-1">
              Speichern & veröffentlichen
            </Button>
          </>
        )}
      </div>

      {classId && (
        <AutoCardPanel
          classId={classId}
          topicId={topicId}
          taskId={task?.id ?? null}
          deckName={(title || "Quiz") + " — Karteikarten"}
          suggestions={suggestFromQuiz(questions)}
        />
      )}
    </div>
  );
}
