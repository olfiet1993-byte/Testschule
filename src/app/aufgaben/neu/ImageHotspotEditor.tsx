"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createImageHotspotTask, updateTask } from "@/lib/actions/tasks";
import { TopicSelect } from "@/components/TopicSelect";
import { nanoid } from "nanoid";
import { Trash2, Image as ImageIcon, MousePointerClick, X } from "lucide-react";

type Hotspot = { id: string; x: number; y: number; radius?: number; label: string; explanation?: string };
const DEFAULT_RADIUS = 8;

export function ImageHotspotEditor({ classes, library, topics, task }: { classes: any[]; library: any[]; topics: any[]; task?: any }) {
  const initialPayload = task ? JSON.parse(task.payload) : null;
  const [pending, start] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [classId, setClassId] = useState(task?.classId ?? classes[0]?.id ?? "");
  const [topicId, setTopicId] = useState<string | null>(task?.topicId ?? null);
  const [xpReward, setXpReward] = useState(task?.xpReward ?? 20);
  const [imagePath, setImagePath] = useState<string | null>(initialPayload?.imagePath ?? null);
  const [hotspots, setHotspots] = useState<Hotspot[]>(initialPayload?.hotspots ?? []);
  const isEdit = !!task;
  const [picking, setPicking] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const images = library.filter((l) => l.type === "image" && l.imagePath);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!imagePath) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = nanoid(6);
    setHotspots((hs) => [...hs, { id, x, y, label: "", radius: DEFAULT_RADIUS }]);
    setSelectedHotspot(id);
  }

  function updateHotspot(id: string, patch: Partial<Hotspot>) {
    setHotspots((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }
  function removeHotspot(id: string) {
    setHotspots((hs) => hs.filter((h) => h.id !== id));
    if (selectedHotspot === id) setSelectedHotspot(null);
  }

  async function submit(publish: boolean) {
    if (!title.trim()) return alert("Titel fehlt");
    if (!classId) return alert("Klasse wählen");
    if (!imagePath) return alert("Bild auswählen");
    if (hotspots.length === 0) return alert("Mindestens einen Hotspot setzen");
    if (hotspots.some((h) => !h.label.trim())) return alert("Jeder Hotspot braucht einen Begriff");
    try {
      if (isEdit) {
        await updateTask({
          taskId: task.id, title, description, classId, xpReward, topicId,
          payload: { imagePath, hotspots },
        });
      } else {
        await createImageHotspotTask({
          classId, topicId, title, description, xpReward, imagePath, hotspots, publish,
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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Skelett: Knochen erkennen" className="mt-1" />
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
          <div className="md:col-span-3">
            <TopicSelect topics={topics} classId={classId} value={topicId} onChange={setTopicId} />
          </div>
        </div>
      </Card>

      <Card>
        <Label>Bild aus Bibliothek</Label>
        {images.length === 0 ? (
          <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            Keine Bilder in der Bibliothek. Lade erst ein Bild unter <strong>Bibliothek → Neuer Inhalt → Bild</strong> hoch.
          </div>
        ) : (
          <div className="mt-3">
            <button type="button" onClick={() => setPicking(true)}
              className="w-full p-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-400 transition flex items-center justify-center gap-2 text-sm text-slate-500">
              <ImageIcon className="w-4 h-4" />
              {imagePath ? "Anderes Bild wählen" : "Bild auswählen"}
            </button>
          </div>
        )}
      </Card>

      {imagePath && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <Label>Hotspots ({hotspots.length})</Label>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" /> Klicke auf das Bild, um einen Hotspot zu setzen
            </span>
          </div>
          <div
            ref={imgRef}
            onClick={handleImageClick}
            className="relative inline-block max-w-full cursor-crosshair select-none"
          >
            <img src={imagePath} alt="Hotspot-Bild" className="max-w-full rounded-lg max-h-[500px] block" />
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {hotspots.map((h) => {
                const r = h.radius ?? DEFAULT_RADIUS;
                const isSel = selectedHotspot === h.id;
                return (
                  <circle
                    key={h.id}
                    cx={h.x}
                    cy={h.y}
                    r={r}
                    fill={isSel ? "rgba(16,185,129,0.12)" : "rgba(14,165,233,0.06)"}
                    stroke={isSel ? "#10b981" : "#0ea5e9"}
                    strokeWidth={isSel ? 0.5 : 0.3}
                    strokeDasharray="1,1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            {hotspots.map((h, i) => {
              const isSel = selectedHotspot === h.id;
              return (
                <button
                  type="button"
                  key={h.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(h.id);
                  }}
                  className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 transition ${
                    isSel
                      ? "bg-emerald-500 border-white scale-125 z-10"
                      : "bg-sky-500 border-white hover:scale-110"
                  }`}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {hotspots.length > 0 && (
            <div className="mt-4 space-y-2">
              {hotspots.map((h, i) => {
                const r = h.radius ?? DEFAULT_RADIUS;
                return (
                  <div
                    key={h.id}
                    className={`p-3 rounded-lg border ${
                      selectedHotspot === h.id ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        selectedHotspot === h.id ? "bg-emerald-500" : "bg-sky-500"
                      }`}>{i + 1}</div>
                      <Input
                        value={h.label}
                        onChange={(e) => updateHotspot(h.id, { label: e.target.value })}
                        placeholder="Was sollen Schüler hier finden? (z. B. Femur)"
                        onFocus={() => setSelectedHotspot(h.id)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeHotspot(h.id)}
                        className="text-slate-400 hover:text-rose-500 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-7 flex-shrink-0" />
                      <label className="flex-shrink-0">Treffer-Radius:</label>
                      <input
                        type="range"
                        min={3}
                        max={20}
                        value={r}
                        onFocus={() => setSelectedHotspot(h.id)}
                        onChange={(e) => updateHotspot(h.id, { radius: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="w-10 text-right font-mono">{r}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {picking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Bild auswählen</h3>
              <button onClick={() => setPicking(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setImagePath(img.imagePath);
                    setHotspots([]);
                    setSelectedHotspot(null);
                    setPicking(false);
                  }}
                  className="text-left rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 transition overflow-hidden"
                >
                  <img src={img.imagePath} alt={img.title} className="w-full h-32 object-cover" />
                  <div className="p-2 text-xs font-medium">{img.title}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
