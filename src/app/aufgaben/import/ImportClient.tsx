"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TopicSelect } from "@/components/TopicSelect";
import { parseFlashcardCSV, parseQuizCSV } from "@/lib/csv";
import { createFlashcardTask, createQuizTask } from "@/lib/actions/tasks";
import { ArrowLeft, Upload, FileText, AlertTriangle, Layers, CheckCircle2 } from "lucide-react";

type Mode = "flashcards" | "quiz";

export function ImportClient({ classes, topics }: { classes: any[]; topics: any[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("flashcards");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [xpReward, setXpReward] = useState(20);
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<{ items: any[]; warnings: string[] } | null>(null);

  function reparse(text: string) {
    setRawText(text);
    if (!text.trim()) { setParsed(null); return; }
    if (mode === "flashcards") {
      const { cards, warnings } = parseFlashcardCSV(text);
      setParsed({ items: cards, warnings });
    } else {
      const { questions, warnings } = parseQuizCSV(text);
      setParsed({ items: questions, warnings });
    }
  }

  function changeMode(newMode: Mode) {
    setMode(newMode);
    if (rawText) {
      if (newMode === "flashcards") {
        const { cards, warnings } = parseFlashcardCSV(rawText);
        setParsed({ items: cards, warnings });
      } else {
        const { questions, warnings } = parseQuizCSV(rawText);
        setParsed({ items: questions, warnings });
      }
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    reparse(text);
    if (!title) {
      // Vorschlagstitel aus Dateiname
      const stem = file.name.replace(/\.(csv|txt)$/i, "");
      setTitle(stem);
    }
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    if (!parsed || parsed.items.length === 0) return alert("Keine Items zum Importieren");

    try {
      if (mode === "flashcards") {
        await createFlashcardTask({
          classId, topicId, title, xpReward,
          cards: parsed.items,
          publish,
        });
      } else {
        await createQuizTask({
          classId, topicId, title, xpReward,
          questions: parsed.items,
          publish,
        });
      }
      router.push("/aufgaben");
    } catch (e: any) {
      alert(e.message ?? "Fehler");
    }
  }

  const flashcardExample = `Vorderseite;Rückseite
Tachykardie;Puls > 100/min beim Erwachsenen
Hypertonie;Bluthochdruck ab 140/90 mmHg
Asepsis;Zustand der Keimfreiheit`;

  const quizExample = `Frage;Antwort1;Antwort2;Antwort3;Antwort4;Richtig;Erklärung
"Was ist Tachykardie?";"Puls > 100/min";"Puls > 60/min";"Puls < 60/min";"Atmung > 20/min";1;"Definition gemäß Lehrbuch"
"Welcher Blutdruck gilt als Hypertonie?";"140/90 mmHg";"120/80 mmHg";"100/60 mmHg";"160/100 mmHg";1;`;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/aufgaben/neu" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>
      <h1 className="text-2xl font-bold mb-1">Aus CSV importieren</h1>
      <p className="text-sm text-slate-500 mb-6">
        Karteikarten oder Quiz-Fragen aus einer CSV-Datei. Excel-kompatibel (Semikolon).
      </p>

      <Card className="mb-4">
        <Label>Aufgabentyp</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={() => changeMode("flashcards")}
            className={`p-3 rounded-lg border-2 text-left transition ${
              mode === "flashcards" ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <Layers className={`w-5 h-5 mb-1 ${mode === "flashcards" ? "text-violet-600" : "text-slate-400"}`} />
            <div className="font-medium text-sm">Karteikarten</div>
            <div className="text-xs text-slate-500">2 Spalten: Vorderseite ; Rückseite</div>
          </button>
          <button
            type="button"
            onClick={() => changeMode("quiz")}
            className={`p-3 rounded-lg border-2 text-left transition ${
              mode === "quiz" ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20" : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 mb-1 ${mode === "quiz" ? "text-sky-600" : "text-slate-400"}`} />
            <div className="font-medium text-sm">Quiz</div>
            <div className="text-xs text-slate-500">Frage ; Antwort1 ; … ; Richtig (1-N) ; [Erklärung]</div>
          </button>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label htmlFor="title">Titel der Aufgabe</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Fachbegriffe Hygiene" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cls">Klasse</Label>
            <select id="cls" value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="xp">XP-Belohnung</Label>
            <Input id="xp" type="number" min={5} max={200} value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <TopicSelect topics={topics} classId={classId} value={topicId} onChange={setTopicId} />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <Label className="mb-2 block">CSV-Datei</Label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white hover:file:bg-sky-500"
        />
        <p className="text-xs text-slate-500 mt-2">Oder direkt einfügen:</p>
        <textarea
          value={rawText}
          onChange={(e) => reparse(e.target.value)}
          rows={6}
          placeholder={mode === "flashcards" ? flashcardExample : quizExample}
          className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs font-mono"
        />
      </Card>

      {parsed && (
        <Card className="mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Vorschau · {parsed.items.length} {parsed.items.length === 1 ? "Eintrag" : "Einträge"}
          </h3>

          {parsed.warnings.length > 0 && (
            <div className="mb-3 p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs">
              <div className="font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3" /> {parsed.warnings.length} Warnung{parsed.warnings.length === 1 ? "" : "en"}:
              </div>
              <ul className="space-y-0.5 ml-3">
                {parsed.warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
                {parsed.warnings.length > 8 && <li>• …und {parsed.warnings.length - 8} weitere</li>}
              </ul>
            </div>
          )}

          {parsed.items.length > 0 && (
            <ol className="space-y-1 text-sm max-h-80 overflow-y-auto">
              {parsed.items.slice(0, 30).map((item: any, i: number) => (
                <li key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-400 mr-2">{i + 1}.</span>
                  {mode === "flashcards" ? (
                    <span><strong>{item.front}</strong> → {item.back}</span>
                  ) : (
                    <div>
                      <div className="font-medium">{item.question}</div>
                      <ul className="text-xs ml-3 mt-1">
                        {item.options.map((o: string, oi: number) => (
                          <li key={oi} className={oi === item.correctIndex ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}>
                            {String.fromCharCode(65 + oi)}) {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
              {parsed.items.length > 30 && (
                <li className="text-xs text-slate-500 text-center pt-2">…und {parsed.items.length - 30} weitere</li>
              )}
            </ol>
          )}
        </Card>
      )}

      <div className="flex gap-2 sticky bottom-4">
        <Button variant="secondary" onClick={() => submit(false)} disabled={pending || !parsed?.items.length} className="flex-1">
          Als Entwurf
        </Button>
        <Button onClick={() => submit(true)} disabled={pending || !parsed?.items.length} className="flex-1">
          <Upload className="w-4 h-4" /> Importieren & veröffentlichen
        </Button>
      </div>
    </div>
  );
}
