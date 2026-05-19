"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createCaseTask, updateTask } from "@/lib/actions/tasks";
import { TopicSelect } from "@/components/TopicSelect";
import { ExamModeSection } from "@/components/ExamModeSection";
import { DifficultySelect } from "@/components/DifficultySelect";
import { nanoid } from "nanoid";
import { Plus, Trash2, Check, Stethoscope, ArrowRight, X, Sparkles } from "lucide-react";
import { AutoCardPanel } from "@/components/AutoCardPanel";
import { suggestFromCase } from "@/lib/cardSuggester";
import { AiGenerateButton } from "@/components/AiGenerateButton";
import { CurriculumSelect, ShareToggle } from "@/components/CurriculumSelect";
import { generateCaseOptions } from "@/lib/actions/aiTaskGen";

type Option = { text: string; feedback?: string; isCorrect: boolean; next: string | null };
type Step = { id: string; description: string; question: string; options: Option[] };

function blankOption(): Option {
  return { text: "", feedback: "", isCorrect: false, next: null };
}
function blankStep(): Step {
  return {
    id: nanoid(6),
    description: "",
    question: "",
    options: [
      { ...blankOption(), isCorrect: true },
      blankOption(),
    ],
  };
}

export function CaseEditor({
  classes,
  topics,
  curriculum = [],
  task,
}: {
  classes: any[];
  topics: any[];
  curriculum?: any[];
  task?: any;
}) {
  const initialPayload = task ? JSON.parse(task.payload) : null;
  const [pending, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [classId, setClassId] = useState(task?.classId ?? classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(task?.topicId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 30);
  const [intro, setIntro] = useState<string>(initialPayload?.intro ?? "");
  const [steps, setSteps] = useState<Step[]>(initialPayload?.steps ?? [blankStep()]);
  const [examMode, setExamMode] = useState<boolean>(!!task?.examMode);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(task?.timeLimitMinutes ?? null);
  const [difficulty, setDifficulty] = useState<number | null>(task?.difficulty ?? null);
  const [curriculumUnitId, setCurriculumUnitId] = useState<string | null>(task?.curriculumUnitId ?? null);
  const [sharedInSchool, setSharedInSchool] = useState<boolean>(!!task?.sharedInSchool);
  const isEdit = !!task;

  function updateStep(stepId: string, patch: Partial<Step>) {
    setSteps((ss) => ss.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }
  function updateOption(stepId: string, oi: number, patch: Partial<Option>) {
    setSteps((ss) =>
      ss.map((s) =>
        s.id === stepId
          ? { ...s, options: s.options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) }
          : s
      )
    );
  }
  function addOption(stepId: string) {
    setSteps((ss) =>
      ss.map((s) =>
        s.id === stepId ? { ...s, options: [...s.options, blankOption()] } : s
      )
    );
  }
  function removeOption(stepId: string, oi: number) {
    setSteps((ss) =>
      ss.map((s) =>
        s.id === stepId
          ? { ...s, options: s.options.filter((_, i) => i !== oi) }
          : s
      )
    );
  }
  function setCorrect(stepId: string, oi: number) {
    setSteps((ss) =>
      ss.map((s) =>
        s.id === stepId
          ? { ...s, options: s.options.map((o, i) => ({ ...o, isCorrect: i === oi })) }
          : s
      )
    );
  }

  const [aiBusyStep, setAiBusyStep] = useState<string | null>(null);

  async function suggestStepOptions(stepId: string) {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    if (!step.question.trim()) return alert("Erst die Schritt-Frage formulieren");
    setAiBusyStep(stepId);
    try {
      const { options } = await generateCaseOptions({
        caseIntro: intro,
        stepQuestion: step.question,
        existingOptions: step.options.filter((o) => o.text?.trim()).map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      });
      const items = Array.isArray(options) ? options : [];
      if (items.length === 0) throw new Error("Keine Vorschläge");
      // Bestehende leere/sinnlose Optionen ersetzen, sonst anhängen
      setSteps((ss) =>
        ss.map((s) => {
          if (s.id !== stepId) return s;
          const newOpts: any[] = [...s.options.filter((o) => o.text?.trim())];
          for (const o of items) {
            if (newOpts.length >= 5) break;
            newOpts.push({
              text: String(o.text ?? ""),
              feedback: String(o.feedback ?? ""),
              isCorrect: !!o.isCorrect,
              next: null,
            });
          }
          // Sicherstellen: genau 1 korrekte
          const hasCorrect = newOpts.some((o) => o.isCorrect);
          if (!hasCorrect && newOpts.length > 0) newOpts[0].isCorrect = true;
          return { ...s, options: newOpts };
        }),
      );
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    } finally {
      setAiBusyStep(null);
    }
  }
  function addStep() {
    setSteps((ss) => [...ss, blankStep()]);
  }
  function removeStep(stepId: string) {
    setSteps((ss) => ss.filter((s) => s.id !== stepId));
  }
  function moveStep(stepId: string, dir: "up" | "down") {
    setSteps((ss) => {
      const idx = ss.findIndex((s) => s.id === stepId);
      if (idx < 0) return ss;
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= ss.length) return ss;
      const next = [...ss];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    if (!intro.trim()) return alert("Intro für den Fall fehlt");
    if (steps.length === 0) return alert("Mindestens ein Schritt");
    for (const s of steps) {
      if (!s.question.trim()) return alert(`Frage in Schritt fehlt`);
      const valid = s.options.filter((o) => o.text.trim());
      if (valid.length < 2) return alert(`Schritt braucht ≥ 2 Optionen`);
      if (!valid.some((o) => o.isCorrect)) return alert(`Pro Schritt mindestens eine korrekte Option markieren`);
    }
    try {
      if (isEdit) {
        await updateTask({
          taskId: task.id, title, description, classId, xpReward, topicId,
          payload: { intro, steps },
          examMode, timeLimitMinutes, difficulty,
          curriculumUnitId, sharedInSchool,
        });
      } else {
        await createCaseTask({
          classId, topicId, title, description, xpReward, intro, steps, publish,
          examMode, timeLimitMinutes, difficulty,
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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Fallstudie: Sturzprophylaxe Frau M." className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classId">Klasse</Label>
            <select id="classId" value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Kurzbeschreibung (optional)</Label>
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
          type="case_study"
          defaultTopic={title}
          onResult={(r) => {
            if (r?.situation) setIntro(String(r.situation));
            if (Array.isArray(r?.questions) && r.questions.length > 0) {
              setSteps(r.questions.map((q: any) => ({
                id: nanoid(6),
                description: "",
                question: String(q.question ?? ""),
                options: [
                  { text: String(q.sampleAnswer ?? ""), feedback: "Richtig.", isCorrect: true, next: null },
                  { text: "Nichts tun, abwarten.", feedback: "Im Notfall meist falsch.", isCorrect: false, next: null },
                ],
              })));
            }
          }}
        />
      </div>

      <Card>
        <Label htmlFor="intro" className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4" /> Fall-Setup (Intro)
        </Label>
        <p className="text-xs text-slate-500 mt-1 mb-2">Schildere die Patientensituation, die der Fall beschreibt.</p>
        <textarea
          id="intro"
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
          placeholder="Frau M., 82, kommt nach einem Sturz aus dem Krankenhaus zurück…"
        />
      </Card>

      {steps.map((s, si) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                {si + 1}
              </div>
              <span className="text-sm font-semibold text-slate-500">Schritt</span>
              <span className="text-xs font-mono text-slate-400">{s.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveStep(s.id, "up")} disabled={si === 0} className="text-slate-400 hover:text-sky-500 disabled:opacity-30 text-xs">↑</button>
              <button type="button" onClick={() => moveStep(s.id, "down")} disabled={si === steps.length - 1} className="text-slate-400 hover:text-sky-500 disabled:opacity-30 text-xs">↓</button>
              {steps.length > 1 && (
                <button type="button" onClick={() => removeStep(s.id)} className="text-slate-400 hover:text-rose-500 ml-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <Label className="text-xs">Situation</Label>
          <textarea
            value={s.description}
            onChange={(e) => updateStep(s.id, { description: e.target.value })}
            rows={2}
            className="w-full mt-1 mb-3 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
            placeholder="Beschreibe die aktuelle Situation…"
          />

          <Label className="text-xs">Frage</Label>
          <Input
            value={s.question}
            onChange={(e) => updateStep(s.id, { question: e.target.value })}
            className="mt-1 mb-3 font-medium"
            placeholder="Was tun Sie als nächstes?"
          />

          <Label className="text-xs">Optionen</Label>
          <div className="space-y-2 mt-1">
            {s.options.map((o, oi) => (
              <div key={oi} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(s.id, oi)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                      o.isCorrect
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                    title="Als korrekt markieren"
                  >
                    {o.isCorrect && <Check className="w-4 h-4" />}
                  </button>
                  <Input
                    value={o.text}
                    onChange={(e) => updateOption(s.id, oi, { text: e.target.value })}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1"
                  />
                  {s.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(s.id, oi)} className="text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 ml-9">
                  <div>
                    <label className="text-xs text-slate-500 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Führt zu
                    </label>
                    <select
                      value={o.next ?? ""}
                      onChange={(e) => updateOption(s.id, oi, { next: e.target.value || null })}
                      className="w-full h-9 px-2 mt-0.5 rounded-md border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs"
                    >
                      <option value="">— Fall beenden —</option>
                      {steps.filter((x) => x.id !== s.id).map((x, idx) => (
                        <option key={x.id} value={x.id}>
                          Schritt {steps.findIndex((y) => y.id === x.id) + 1}: {x.question.slice(0, 30) || "(unbenannt)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Feedback (optional)</label>
                    <Input
                      value={o.feedback ?? ""}
                      onChange={(e) => updateOption(s.id, oi, { feedback: e.target.value })}
                      placeholder="Was Schüler nach der Wahl sehen sollen"
                      className="h-9 text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 flex-wrap">
              {s.options.length < 5 && (
                <button
                  type="button"
                  onClick={() => addOption(s.id)}
                  className="text-sm text-sky-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Option
                </button>
              )}
              <button
                type="button"
                onClick={() => suggestStepOptions(s.id)}
                disabled={aiBusyStep !== null}
                className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 disabled:opacity-50 transition"
                title="KI schlägt 3 Optionen mit Feedback vor (1 richtig, 2 falsch)"
              >
                <Sparkles className="w-3 h-3" />
                {aiBusyStep === s.id ? "Denke…" : "Optionen vorschlagen"}
              </button>
            </div>
          </div>
        </Card>
      ))}

      <Button type="button" variant="secondary" onClick={addStep} className="w-full">
        <Plus className="w-4 h-4" /> Weiterer Schritt
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
          deckName={(title || "Fallstudie") + " — Karteikarten"}
          suggestions={suggestFromCase(steps)}
        />
      )}
    </div>
  );
}
