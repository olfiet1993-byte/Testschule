"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createVitalScenario, deleteVitalScenario, togglePublishScenario } from "@/lib/actions/vitalScenarios";
import { generateVitalScenarioWithAI } from "@/lib/actions/aiTaskGen";
import { Activity, Plus, Trash2, Eye, EyeOff, X, Save, Heart, Sparkles } from "lucide-react";

type Cons = "alert" | "verwirrt" | "somnolent" | "bewusstlos";

const blankPayload = () => ({
  vitals: {
    pulse: 80, systolic: 120, diastolic: 75, respRate: 16, spo2: 97, tempC: 36.8,
    consciousness: "alert" as Cons,
  },
  abnormal: [] as string[],
  diagnosis: "",
  correctActions: ["", "", ""],
  distractorActions: ["", ""],
});

const VITAL_KEYS = [
  { key: "pulse", label: "Puls", unit: "bpm" },
  { key: "systolic", label: "RR sys.", unit: "mmHg" },
  { key: "diastolic", label: "RR dia.", unit: "mmHg" },
  { key: "respRate", label: "AF", unit: "/min" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "tempC", label: "Temp", unit: "°C" },
  { key: "consciousness", label: "Bewusstsein", unit: "" },
];

function AiQuickFill({ onResult }: { onResult: (r: any) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [topic, setTopic] = useState("");
  const [diff, setDiff] = useState<"leicht" | "mittel" | "schwer">("mittel");
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (!topic.trim()) return setError("Thema eintippen");
    setError(null);
    start(async () => {
      try {
        const r = await generateVitalScenarioWithAI({ topic, difficulty: diff });
        onResult(r);
        setOpen(false);
        setTopic("");
      } catch (e: any) {
        setError(e.message ?? "Fehler");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="brand" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="w-4 h-4" /> Mit KI generieren
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md !p-5 shadow-lift">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold">Vital-Szenario generieren</h3>
              <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Sag Claude, welches Krankheitsbild oder welche Notfall-Situation du brauchst — du bekommst einen realistischen Fall vorausgefüllt.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Thema / Situation</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="z. B. Anaphylaktischer Schock nach Penicillin"
                  className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">Schwierigkeit</label>
                <select
                  value={diff}
                  onChange={(e) => setDiff(e.target.value as any)}
                  className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                >
                  <option value="leicht">🟢 leicht</option>
                  <option value="mittel">🟡 mittel</option>
                  <option value="schwer">🔴 schwer</option>
                </select>
              </div>
              {error && <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 p-2 rounded">{error}</div>}
              <div className="flex gap-2 pt-2">
                <Button onClick={run} disabled={pending} variant="brand" className="flex-1">
                  {pending ? "Claude denkt…" : <><Sparkles className="w-4 h-4" /> Generieren</>}
                </Button>
                <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Abbrechen</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function VitalScenarioManager({
  classId,
  className,
  scenarios: initial,
}: {
  classId: string;
  className: string;
  scenarios: any[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scenarios, setScenarios] = useState(initial);
  const [adding, setAdding] = useState(false);

  // Form-State
  const [patient, setPatient] = useState("");
  const [age, setAge] = useState(60);
  const [context, setContext] = useState("");
  const [payload, setPayload] = useState(blankPayload());

  function updateVital(k: string, v: any) {
    setPayload((p) => ({ ...p, vitals: { ...p.vitals, [k]: v } }));
  }
  function toggleAbnormal(k: string) {
    setPayload((p) => ({
      ...p,
      abnormal: p.abnormal.includes(k) ? p.abnormal.filter((x) => x !== k) : [...p.abnormal, k],
    }));
  }
  function updateAction(arr: "correctActions" | "distractorActions", i: number, v: string) {
    setPayload((p) => ({
      ...p,
      [arr]: p[arr].map((x, idx) => (idx === i ? v : x)),
    }));
  }
  function addAction(arr: "correctActions" | "distractorActions") {
    setPayload((p) => ({ ...p, [arr]: [...p[arr], ""] }));
  }

  async function save() {
    if (!patient.trim() || !context.trim()) return alert("Patient + Kontext nötig");
    const cleanedCorrect = payload.correctActions.map((a) => a.trim()).filter(Boolean);
    const cleanedDistract = payload.distractorActions.map((a) => a.trim()).filter(Boolean);
    if (cleanedCorrect.length === 0) return alert("Mindestens 1 richtige Maßnahme");
    start(async () => {
      try {
        await createVitalScenario({
          classId,
          patientName: patient,
          age,
          context,
          payload: {
            ...payload,
            correctActions: cleanedCorrect,
            distractorActions: cleanedDistract,
          },
        });
        setAdding(false);
        setPatient(""); setAge(60); setContext(""); setPayload(blankPayload());
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function doDelete(id: string) {
    if (!confirm("Szenario löschen?")) return;
    start(async () => {
      await deleteVitalScenario(id);
      setScenarios((s) => s.filter((x) => x.id !== id));
      router.refresh();
    });
  }
  async function toggleP(id: string) {
    start(async () => {
      await togglePublishScenario(id);
      setScenarios((s) => s.map((x) => (x.id === id ? { ...x, published: !x.published } : x)));
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
            <Activity className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vital-Szenarien — {className}</h1>
            <p className="text-sm text-slate-500">Eigene Fälle für deine Klasse anlegen.</p>
          </div>
        </div>
        <Button onClick={() => setAdding(!adding)} variant="brand">
          {adding ? <><X className="w-4 h-4" /> Schließen</> : <><Plus className="w-4 h-4" /> Neuer Fall</>}
        </Button>
      </div>

      {adding && (
        <Card className="border-rose-200 dark:border-rose-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Neues Vital-Szenario</h3>
            <AiQuickFill
              onResult={(r) => {
                setPatient(String(r.patientName ?? ""));
                setAge(Number(r.age ?? 60));
                setContext(String(r.context ?? ""));
                setPayload({
                  vitals: {
                    pulse: Number(r.vitals?.pulse ?? 80),
                    systolic: Number(r.vitals?.systolic ?? 120),
                    diastolic: Number(r.vitals?.diastolic ?? 75),
                    respRate: Number(r.vitals?.respRate ?? 16),
                    spo2: Number(r.vitals?.spo2 ?? 97),
                    tempC: Number(r.vitals?.tempC ?? 36.8),
                    consciousness: (["alert","verwirrt","somnolent","bewusstlos"].includes(r.vitals?.consciousness) ? r.vitals.consciousness : "alert") as Cons,
                  },
                  abnormal: Array.isArray(r.abnormal) ? r.abnormal : [],
                  diagnosis: String(r.diagnosis ?? ""),
                  correctActions: Array.isArray(r.correctActions) && r.correctActions.length ? r.correctActions.map(String) : [""],
                  distractorActions: Array.isArray(r.distractorActions) && r.distractorActions.length ? r.distractorActions.map(String) : [""],
                });
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2">
              <Label htmlFor="patient">Patient:in</Label>
              <Input id="patient" value={patient} onChange={(e) => setPatient(e.target.value)} placeholder="z. B. Herr Becker" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="age">Alter</Label>
              <Input id="age" type="number" min={0} max={130} value={age} onChange={(e) => setAge(Number(e.target.value))} className="mt-1" />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="ctx">Kontext</Label>
              <textarea
                id="ctx"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                placeholder="Schilder die Situation: Symptome, Vorgeschichte, Auffälligkeiten."
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
              />
            </div>
          </div>

          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500" /> Vitalwerte</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {VITAL_KEYS.map((v) => (
              <div key={v.key}>
                <Label className="text-xs">{v.label} <span className="text-slate-400">{v.unit}</span></Label>
                {v.key === "consciousness" ? (
                  <select
                    value={payload.vitals.consciousness}
                    onChange={(e) => updateVital("consciousness", e.target.value)}
                    className="w-full h-9 px-2 mt-1 rounded border text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  >
                    <option value="alert">wach</option>
                    <option value="verwirrt">verwirrt</option>
                    <option value="somnolent">somnolent</option>
                    <option value="bewusstlos">bewusstlos</option>
                  </select>
                ) : (
                  <Input
                    type={v.key === "tempC" ? "text" : "number"}
                    inputMode={v.key === "tempC" ? "decimal" : "numeric"}
                    value={(payload.vitals as any)[v.key]}
                    onChange={(e) => updateVital(v.key, v.key === "tempC" ? parseFloat(e.target.value.replace(",", ".")) : Number(e.target.value))}
                    className="mt-1 h-9"
                  />
                )}
              </div>
            ))}
          </div>

          <Label className="text-sm">Welche Werte sind <strong>auffällig</strong>? (Klick zum Auswählen)</Label>
          <div className="flex flex-wrap gap-1 mt-1 mb-4">
            {VITAL_KEYS.map((v) => {
              const on = payload.abnormal.includes(v.key);
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => toggleAbnormal(v.key)}
                  className={`px-2.5 py-1 rounded-full text-xs transition ${
                    on
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm text-emerald-700 dark:text-emerald-300">✅ Richtige Maßnahmen</Label>
              {payload.correctActions.map((a, i) => (
                <Input
                  key={i}
                  value={a}
                  onChange={(e) => updateAction("correctActions", i, e.target.value)}
                  placeholder={`Maßnahme ${i + 1}`}
                  className="mt-1"
                />
              ))}
              <button type="button" onClick={() => addAction("correctActions")} className="text-xs text-emerald-600 hover:underline mt-1">
                + weitere
              </button>
            </div>
            <div>
              <Label className="text-sm text-amber-700 dark:text-amber-300">⚠️ Falsche/unnötige Optionen</Label>
              {payload.distractorActions.map((a, i) => (
                <Input
                  key={i}
                  value={a}
                  onChange={(e) => updateAction("distractorActions", i, e.target.value)}
                  placeholder={`Distraktor ${i + 1}`}
                  className="mt-1"
                />
              ))}
              <button type="button" onClick={() => addAction("distractorActions")} className="text-xs text-amber-600 hover:underline mt-1">
                + weitere
              </button>
            </div>
          </div>

          <div className="mb-4">
            <Label htmlFor="diag">Diagnose / Auflösung</Label>
            <Input
              id="diag"
              value={payload.diagnosis}
              onChange={(e) => setPayload((p) => ({ ...p, diagnosis: e.target.value }))}
              placeholder="z. B. Hypoglykämie"
              className="mt-1"
            />
          </div>

          <Button onClick={save} disabled={pending} variant="brand" className="w-full">
            <Save className="w-4 h-4" /> {pending ? "Speichere…" : "Szenario speichern"}
          </Button>
        </Card>
      )}

      {scenarios.length === 0 ? (
        <Card className="text-center py-10">
          <Activity className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine eigenen Szenarien.</p>
          <p className="text-xs text-slate-400 mt-1">
            Deine Schüler:innen üben so lange mit den 5 Standard-Fällen.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => {
            const payload = typeof s.payload === "string" ? JSON.parse(s.payload) : s.payload;
            return (
              <Card key={s.id} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{s.patientName}, {s.age}</h3>
                      {s.published ? (
                        <Badge className="bg-emerald-100 text-emerald-700">veröffentlicht</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600">Entwurf</Badge>
                      )}
                      <span className="text-xs text-slate-500">→ {payload.diagnosis || "—"}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{s.context}</p>
                    <div className="text-xs text-slate-500 mt-1.5">
                      Puls {payload.vitals.pulse} · BD {payload.vitals.systolic}/{payload.vitals.diastolic} · AF {payload.vitals.respRate} · SpO₂ {payload.vitals.spo2}%
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => toggleP(s.id)} className="text-slate-400 hover:text-sky-600" title="Veröffentlichung umschalten">
                      {s.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => doDelete(s.id)} className="text-slate-400 hover:text-rose-500" title="Löschen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
