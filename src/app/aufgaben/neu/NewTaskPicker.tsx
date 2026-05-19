"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Input";
import { CheckCircle2, Layers, Image as ImageIcon, ArrowLeft, ArrowRight, AlignJustify, Stethoscope, Upload } from "lucide-react";
import Link from "next/link";
import { QuizEditor } from "./QuizEditor";
import { FlashcardEditor } from "./FlashcardEditor";
import { ImageHotspotEditor } from "./ImageHotspotEditor";
import { ClozeEditor } from "./ClozeEditor";
import { CaseEditor } from "./CaseEditor";

const TYPES = [
  {
    key: "quiz",
    label: "Quiz",
    icon: CheckCircle2,
    color: "bg-sky-500",
    desc: "Single-Choice mit 2–6 Antwortmöglichkeiten und Erklärung pro Frage. Klassiker für Wissensabfrage.",
    example: "z. B. 'Welcher Wert gilt als normaler Puls in Ruhe?'",
  },
  {
    key: "flashcards",
    label: "Karteikarten",
    icon: Layers,
    color: "bg-violet-500",
    desc: "Vorderseite/Rückseite zum Auswendiglernen. Schüler bewertet sich selbst ('kannte ich / wusste ich nicht').",
    example: "z. B. Fachbegriffe, Definitionen, Vokabeln",
  },
  {
    key: "image_hotspot",
    label: "Bilderrätsel",
    icon: ImageIcon,
    color: "bg-emerald-500",
    desc: "Bild aus deiner Bibliothek + anklickbare Punkte. Schüler muss z. B. anatomische Strukturen treffen.",
    example: "z. B. 'Klicke auf den Femur' auf einem Skelett-Bild",
  },
  {
    key: "cloze",
    label: "Lückentext",
    icon: AlignJustify,
    color: "bg-amber-500",
    desc: "Text mit Lücken, die Schüler ausfüllen müssen. Mehrere richtige Antworten/Synonyme pro Lücke möglich.",
    example: "z. B. 'Tachykardie = Puls über ___ Schläge pro Minute'",
  },
  {
    key: "case_study",
    label: "Fallstudie",
    icon: Stethoscope,
    color: "bg-rose-500",
    desc: "Verzweigtes Patientenszenario mit Entscheidungspunkten. Schüler arbeiten sich Schritt für Schritt durch und erhalten nach jeder Wahl Feedback.",
    example: "z. B. 'Frau M., 82 J., kommt nach Sturz aus dem Krankenhaus zurück…'",
  },
] as const;

export function NewTaskPicker({
  type,
  classes,
  library,
  topics,
  curriculum,
}: {
  type: string | null;
  classes: any[];
  library: any[];
  topics: any[];
  curriculum: any[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(type);

  if (selected === "quiz") {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Anderer Typ
        </button>
        <h1 className="text-2xl font-bold mb-1">Neues Quiz</h1>
        <p className="text-sm text-slate-500 mb-6">Single-Choice Aufgaben</p>
        <QuizEditor classes={classes} topics={topics} curriculum={curriculum} />
      </>
    );
  }

  if (selected === "flashcards") {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Anderer Typ
        </button>
        <h1 className="text-2xl font-bold mb-1">Neue Karteikarten-Aufgabe</h1>
        <p className="text-sm text-slate-500 mb-6">Vorder- und Rückseite — kann aus Bibliotheks-Begriffen importiert werden.</p>
        <FlashcardEditor classes={classes} library={library} topics={topics} curriculum={curriculum} />
      </>
    );
  }

  if (selected === "image_hotspot") {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Anderer Typ
        </button>
        <h1 className="text-2xl font-bold mb-1">Neues Bilderrätsel</h1>
        <p className="text-sm text-slate-500 mb-6">Wähle ein Bild aus deiner Bibliothek und markiere Hotspots zum Anklicken.</p>
        <ImageHotspotEditor classes={classes} library={library} topics={topics} />
      </>
    );
  }

  if (selected === "cloze") {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Anderer Typ
        </button>
        <h1 className="text-2xl font-bold mb-1">Neuer Lückentext</h1>
        <p className="text-sm text-slate-500 mb-6">Markiere Lücken im Text mit {`{{Antwort}}`} — die App erkennt sie automatisch.</p>
        <ClozeEditor classes={classes} topics={topics} curriculum={curriculum} />
      </>
    );
  }

  if (selected === "case_study") {
    return (
      <>
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Anderer Typ
        </button>
        <h1 className="text-2xl font-bold mb-1">Neue Fallstudie</h1>
        <p className="text-sm text-slate-500 mb-6">Schritte mit Entscheidungspunkten — jede Option führt zum nächsten Schritt oder zum Fall-Ende.</p>
        <CaseEditor classes={classes} topics={topics} curriculum={curriculum} />
      </>
    );
  }

  return (
    <>
      <Link href="/aufgaben" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Aufgaben
      </Link>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Neue Aufgabe</h1>
          <p className="text-sm text-slate-500">Aufgabentyp wählen:</p>
        </div>
        <Link href="/aufgaben/import">
          <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition cursor-pointer">
            <Upload className="w-4 h-4" /> CSV-Import
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelected(t.key)}
              className="text-left"
            >
              <Card className="hover:shadow-lg transition cursor-pointer h-full flex flex-col">
                <div className={`w-12 h-12 rounded-xl ${t.color} text-white flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{t.label}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex-1">{t.desc}</p>
                <p className="text-xs text-slate-500 italic">{t.example}</p>
                <div className="mt-3 text-sm text-sky-600 inline-flex items-center gap-1">
                  Starten <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </>
  );
}
