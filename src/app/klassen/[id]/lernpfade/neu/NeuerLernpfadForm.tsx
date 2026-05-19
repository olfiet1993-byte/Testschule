"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createLearningPath, autoFillLearningPath } from "@/lib/actions/learningPaths";
import { Sparkles, Map } from "lucide-react";

function nextMondayIso(): string {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0=Mo
  // Wenn heute Mo, dann heute. Sonst nächster Mo.
  if (dow !== 0) d.setDate(d.getDate() + (7 - dow));
  return d.toISOString().slice(0, 10);
}

export function NeuerLernpfadForm({
  classId,
  topics,
  taskCount,
}: {
  classId: string;
  topics: any[];
  taskCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [startsOn, setStartsOn] = useState(nextMondayIso());
  const [numWeeks, setNumWeeks] = useState(4);
  const [useGenerator, setUseGenerator] = useState(true);
  const [onlyPublished, setOnlyPublished] = useState(true);

  async function submit() {
    if (!name.trim()) return alert("Name fehlt");
    start(async () => {
      try {
        const pathId = await createLearningPath({
          classId,
          topicId,
          name,
          description,
          startsOn,
          numWeeks,
        });
        if (useGenerator) {
          const res = await autoFillLearningPath({
            pathId,
            fromTopicId: topicId,
            onlyPublished,
          });
          if (res.added === 0) {
            alert("Lernpfad angelegt — aber keine passenden Aufgaben gefunden. Du kannst sie manuell hinzufügen.");
          }
        }
        router.push(`/klassen/${classId}/lernpfade/${pathId}`);
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Titel</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Vitalwerte — 4 Wochen Vertiefung" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="desc">Beschreibung (optional)</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Worum geht es in diesem Lernpfad?" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="starts">Startdatum (Montag)</Label>
              <Input id="starts" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="mt-1" />
              <p className="text-xs text-slate-500 mt-1">Wird automatisch auf den Montag dieser Woche gesetzt.</p>
            </div>
            <div>
              <Label htmlFor="weeks">Wochen</Label>
              <Input id="weeks" type="number" min={1} max={26} value={numWeeks} onChange={(e) => setNumWeeks(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="topic">Themenbezug (optional)</Label>
            <select id="topic" value={topicId ?? ""} onChange={(e) => setTopicId(e.target.value || null)}
              className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
              <option value="">— alle Themen —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h3 className="font-semibold">Automatischer Aufgabenplan</h3>
        </div>
        <label className="flex items-center gap-2 text-sm mb-2">
          <input type="checkbox" checked={useGenerator} onChange={(e) => setUseGenerator(e.target.checked)} />
          Aufgaben automatisch über die Wochen verteilen (sortiert nach Schwierigkeit)
        </label>
        {useGenerator && (
          <div className="pl-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyPublished} onChange={(e) => setOnlyPublished(e.target.checked)} />
              Nur veröffentlichte Aufgaben einplanen
            </label>
            <p className="text-xs text-slate-500">
              {taskCount} Aufgaben in dieser Klasse verfügbar. Sie werden gleichmäßig auf {numWeeks} Wochen verteilt (leicht → mittel → schwer).
              Du kannst danach jederzeit manuell anpassen.
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-2 sticky bottom-4">
        <Button onClick={submit} disabled={pending} className="flex-1">
          <Map className="w-4 h-4" /> {pending ? "Wird angelegt…" : "Lernpfad anlegen"}
        </Button>
      </div>
    </div>
  );
}
