"use client";

import { useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Activity, Heart, Wind, Thermometer, Droplet, AlertTriangle, CheckCircle2, Shuffle, Stethoscope, Trophy } from "lucide-react";

type Vitals = {
  pulse: number;         // bpm
  systolic: number;      // mmHg
  diastolic: number;     // mmHg
  respRate: number;      // /min
  spo2: number;          // %
  tempC: number;         // °C
  consciousness: "alert" | "verwirrt" | "somnolent" | "bewusstlos";
};

type Scenario = {
  id: string;
  patient: string;
  age: number;
  context: string;
  vitals: Vitals;
  diagnosis: string;
  abnormal: Array<keyof Vitals>;
  correctActions: string[];
  distractorActions: string[];
};

const SCENARIOS: Scenario[] = [
  {
    id: "hypovol",
    patient: "Herr Bauer",
    age: 67,
    context: "Postoperativ nach Hüft-OP. Klagt über Schwindel beim Aufstehen. Verband am Drainageschlauch hat sich gelöst.",
    vitals: { pulse: 128, systolic: 86, diastolic: 54, respRate: 24, spo2: 95, tempC: 36.2, consciousness: "verwirrt" },
    diagnosis: "Hypovolämischer Schock (Blutverlust)",
    abnormal: ["pulse", "systolic", "respRate", "consciousness"],
    correctActions: [
      "Schocklagerung (Beine hoch, Oberkörper flach)",
      "Arzt sofort informieren",
      "i.v. Zugang sichern / Infusion vorbereiten",
      "Blutung kontrollieren / komprimieren",
    ],
    distractorActions: [
      "Oberkörperhochlagerung",
      "Patient aufstehen lassen, damit ihm warm wird",
      "Sofort Schmerzmittel geben",
    ],
  },
  {
    id: "linksherz",
    patient: "Frau Schmidt",
    age: 78,
    context: "Bekannte Herzinsuffizienz. Plötzliche Atemnot seit 1 h, sitzt aufrecht im Bett, brodelnde Atmung.",
    vitals: { pulse: 112, systolic: 168, diastolic: 98, respRate: 30, spo2: 86, tempC: 36.8, consciousness: "alert" },
    diagnosis: "Akute Linksherzinsuffizienz / Lungenödem",
    abnormal: ["pulse", "systolic", "diastolic", "respRate", "spo2"],
    correctActions: [
      "Oberkörper hoch / Beine tief (herzentlastend)",
      "Sauerstoff geben (4–6 L über Maske)",
      "Arzt informieren",
      "Vitalparameter engmaschig überwachen",
    ],
    distractorActions: [
      "Flach lagern, damit Patient sich entspannt",
      "Großzügig Flüssigkeit anbieten",
      "Aktivieren zur Mobilisation",
    ],
  },
  {
    id: "hypoglyk",
    patient: "Herr Klein",
    age: 54,
    context: "Diabetiker, hat morgens Insulin gespritzt, dann das Frühstück nicht gegessen. Wird zittrig und schwitzig.",
    vitals: { pulse: 118, systolic: 138, diastolic: 86, respRate: 20, spo2: 98, tempC: 36.6, consciousness: "verwirrt" },
    diagnosis: "Hypoglykämie",
    abnormal: ["pulse", "consciousness"],
    correctActions: [
      "Blutzucker sofort messen",
      "Bei Bewusstsein: schnelle Kohlenhydrate oral (Saft/Traubenzucker)",
      "Arzt informieren",
      "Bei Bewusstlosigkeit: stabile Seitenlage, Glukose i.v.",
    ],
    distractorActions: [
      "Insulin nachspritzen",
      "Patient hinlegen und schlafen lassen",
      "Reichlich Wasser geben",
    ],
  },
  {
    id: "sepsis",
    patient: "Frau Wagner",
    age: 71,
    context: "Seit 2 Tagen Harnwegsinfekt. Heute morgen plötzlich starke Schwäche, fiebrig, kalter Schweiß.",
    vitals: { pulse: 124, systolic: 88, diastolic: 50, respRate: 28, spo2: 92, tempC: 39.4, consciousness: "verwirrt" },
    diagnosis: "Sepsis (mögl. urosepsis-Verdacht)",
    abnormal: ["pulse", "systolic", "respRate", "spo2", "tempC", "consciousness"],
    correctActions: [
      "Arzt sofort informieren — Notfall!",
      "i.v. Zugang sichern, Blutkultur",
      "Vitalwerte engmaschig kontrollieren",
      "Volumengabe nach Anordnung",
    ],
    distractorActions: [
      "Erst abwarten und Wadenwickel",
      "Schmerzmittel + warme Decke",
      "Patient zur Mobilisation aufstehen lassen",
    ],
  },
  {
    id: "normal",
    patient: "Herr Hoffmann",
    age: 45,
    context: "Routine-Kontrolle vor Entlassung nach Pneumonie.",
    vitals: { pulse: 72, systolic: 122, diastolic: 78, respRate: 14, spo2: 97, tempC: 36.7, consciousness: "alert" },
    diagnosis: "Unauffällige Vitalwerte",
    abnormal: [],
    correctActions: [
      "Standard-Dokumentation, keine akute Intervention",
      "Mobilisation fortsetzen",
    ],
    distractorActions: [
      "Notruf absetzen",
      "Sofort Sauerstoff geben",
      "Schocklagerung",
    ],
  },
];

const NORMAL = {
  pulse: "60–100 bpm",
  systolic: "100–140 mmHg",
  diastolic: "60–90 mmHg",
  respRate: "12–20/min",
  spo2: "≥ 96 %",
  tempC: "36,3–37,4 °C",
  consciousness: "wach & orientiert",
};

function isAbnormal(vital: keyof Vitals, value: any): boolean {
  switch (vital) {
    case "pulse": return value < 50 || value > 100;
    case "systolic": return value < 100 || value > 140;
    case "diastolic": return value < 60 || value > 90;
    case "respRate": return value < 12 || value > 20;
    case "spo2": return value < 95;
    case "tempC": return value < 36 || value > 37.5;
    case "consciousness": return value !== "alert";
    default: return false;
  }
}

const VITAL_META: Array<{
  key: keyof Vitals;
  label: string;
  unit: string;
  icon: any;
  color: string;
  normal: string;
}> = [
  { key: "pulse", label: "Puls", unit: "bpm", icon: Heart, color: "text-rose-500", normal: NORMAL.pulse },
  { key: "systolic", label: "Blutdruck syst.", unit: "mmHg", icon: Activity, color: "text-violet-500", normal: NORMAL.systolic },
  { key: "diastolic", label: "Blutdruck diast.", unit: "mmHg", icon: Activity, color: "text-violet-500", normal: NORMAL.diastolic },
  { key: "respRate", label: "Atemfrequenz", unit: "/min", icon: Wind, color: "text-sky-500", normal: NORMAL.respRate },
  { key: "spo2", label: "SpO₂", unit: "%", icon: Droplet, color: "text-blue-500", normal: NORMAL.spo2 },
  { key: "tempC", label: "Temperatur", unit: "°C", icon: Thermometer, color: "text-orange-500", normal: NORMAL.tempC },
];

type Step = "assess" | "choose" | "feedback";

export function VitalSim({ customScenarios = [] }: { customScenarios?: any[] }) {
  // Eigene Szenarien zuerst, dann Standard
  const allScenarios = useMemo<Scenario[]>(() => {
    const customMapped: Scenario[] = customScenarios.map((c: any) => ({
      id: "custom-" + c.id,
      patient: c.patient,
      age: c.age,
      context: c.context,
      vitals: c.vitals,
      diagnosis: c.diagnosis,
      abnormal: c.abnormal as Array<keyof Vitals>,
      correctActions: c.correctActions,
      distractorActions: c.distractorActions,
    }));
    return [...customMapped, ...SCENARIOS];
  }, [customScenarios]);

  const [scenario, setScenario] = useState<Scenario>(() => allScenarios[Math.floor(Math.random() * allScenarios.length)]);
  const [step, setStep] = useState<Step>("assess");
  const [picked, setPicked] = useState<Set<keyof Vitals>>(new Set());
  const [pickedActions, setPickedActions] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);

  const correctVitals = useMemo(() => new Set(scenario.abnormal), [scenario]);
  const allActions = useMemo(() => {
    return [...scenario.correctActions, ...scenario.distractorActions].sort(() => Math.random() - 0.5);
  }, [scenario]);

  function newCase() {
    let next = allScenarios[Math.floor(Math.random() * allScenarios.length)];
    while (next.id === scenario.id && allScenarios.length > 1) {
      next = allScenarios[Math.floor(Math.random() * allScenarios.length)];
    }
    setScenario(next);
    setStep("assess");
    setPicked(new Set());
    setPickedActions(new Set());
  }

  function checkVitalsAssessment() {
    setStep("choose");
  }

  function submitActions() {
    setStep("feedback");
    // Bewertung
    const correctPicks = [...pickedActions].filter((a) => scenario.correctActions.includes(a)).length;
    const totalCorrect = scenario.correctActions.length;
    const wrongPicks = [...pickedActions].filter((a) => scenario.distractorActions.includes(a)).length;
    const vitalAccuracy =
      scenario.abnormal.length === 0
        ? picked.size === 0
          ? 1
          : 0
        : ([...picked].filter((v) => correctVitals.has(v)).length / scenario.abnormal.length) -
          ([...picked].filter((v) => !correctVitals.has(v)).length / VITAL_META.length);
    const actionAccuracy = totalCorrect === 0 ? 1 : correctPicks / totalCorrect - wrongPicks * 0.25;

    const score = Math.max(0, Math.min(1, (vitalAccuracy + actionAccuracy) / 2));
    if (score >= 0.7) setStreak((s) => s + 1);
    else setStreak(0);
  }

  function getScore(): number {
    if (step !== "feedback") return 0;
    const correctPicks = [...pickedActions].filter((a) => scenario.correctActions.includes(a)).length;
    const totalCorrect = scenario.correctActions.length;
    const wrongPicks = [...pickedActions].filter((a) => scenario.distractorActions.includes(a)).length;
    const vitalAccuracy =
      scenario.abnormal.length === 0
        ? picked.size === 0
          ? 1
          : Math.max(0, 1 - picked.size / VITAL_META.length)
        : ([...picked].filter((v) => correctVitals.has(v)).length / scenario.abnormal.length) -
          ([...picked].filter((v) => !correctVitals.has(v)).length / VITAL_META.length);
    const actionAccuracy = totalCorrect === 0 ? 1 : correctPicks / totalCorrect - wrongPicks * 0.25;
    return Math.max(0, Math.min(1, (vitalAccuracy + actionAccuracy) / 2));
  }

  const score = step === "feedback" ? Math.round(getScore() * 100) : 0;

  function toggleVital(key: keyof Vitals) {
    if (step !== "assess") return;
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAction(action: string) {
    if (step !== "choose") return;
    setPickedActions((p) => {
      const next = new Set(p);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
            <Activity className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vitalwerte-Simulator</h1>
            <p className="text-sm text-slate-500">Trainiere, ungewöhnliche Werte und die richtige Reaktion zu erkennen.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              🔥 {streak} in Folge
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={newCase}>
            <Shuffle className="w-4 h-4" /> Neuer Fall
          </Button>
        </div>
      </div>

      {/* Patient-Karte */}
      <Card className="bg-gradient-to-br from-slate-50 to-rose-50/40 dark:from-slate-900 dark:to-rose-900/10 border-rose-200 dark:border-rose-900/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-rose-200 dark:bg-rose-900/50 flex items-center justify-center text-2xl flex-shrink-0">
            🧑‍🦳
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{scenario.patient}, {scenario.age} Jahre</div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{scenario.context}</p>
          </div>
        </div>
      </Card>

      {/* Vitalwerte */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Vitalwerte</h2>
          {step === "assess" && (
            <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              Schritt 1: Welche sind <strong className="mx-1">auffällig</strong>?
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {VITAL_META.map((m) => {
            const Icon = m.icon;
            const value = scenario.vitals[m.key];
            const isPicked = picked.has(m.key);
            const isActuallyAbnormal = correctVitals.has(m.key);
            let cardClass = "border-slate-200 dark:border-slate-700";
            if (step === "assess" && isPicked) cardClass = "border-sky-400 bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-300";
            if (step === "feedback") {
              if (isActuallyAbnormal && isPicked) cardClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30";
              else if (isActuallyAbnormal && !isPicked) cardClass = "border-rose-400 bg-rose-50 dark:bg-rose-900/30";
              else if (!isActuallyAbnormal && isPicked) cardClass = "border-amber-400 bg-amber-50 dark:bg-amber-900/30";
            }
            const display = m.key === "tempC" ? value.toString().replace(".", ",") : String(value);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleVital(m.key)}
                disabled={step !== "assess"}
                className={`p-3 rounded-xl border-2 text-left transition-all ${cardClass} ${step !== "assess" ? "cursor-default" : "cursor-pointer hover:border-sky-300"}`}
              >
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                  {m.label}
                </div>
                <div className="text-2xl font-bold">{display}<span className="text-xs font-normal text-slate-500 ml-1">{m.unit}</span></div>
                <div className="text-[10px] text-slate-400 mt-1">Norm: {m.normal}</div>
                {step === "feedback" && isActuallyAbnormal && (
                  <Badge className="mt-1 bg-rose-100 text-rose-700 text-[10px]">auffällig</Badge>
                )}
              </button>
            );
          })}
          {/* Bewusstsein */}
          <button
            type="button"
            onClick={() => toggleVital("consciousness")}
            disabled={step !== "assess"}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              step === "assess" && picked.has("consciousness")
                ? "border-sky-400 bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-300"
                : step === "feedback"
                  ? correctVitals.has("consciousness") && picked.has("consciousness")
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                    : correctVitals.has("consciousness") && !picked.has("consciousness")
                      ? "border-rose-400 bg-rose-50 dark:bg-rose-900/30"
                      : !correctVitals.has("consciousness") && picked.has("consciousness")
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30"
                        : "border-slate-200 dark:border-slate-700"
                  : "border-slate-200 dark:border-slate-700"
            } ${step !== "assess" ? "cursor-default" : "cursor-pointer hover:border-sky-300"}`}
          >
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
              Bewusstsein
            </div>
            <div className="text-xl font-bold capitalize">{scenario.vitals.consciousness}</div>
            <div className="text-[10px] text-slate-400 mt-1">Norm: {NORMAL.consciousness}</div>
            {step === "feedback" && correctVitals.has("consciousness") && (
              <Badge className="mt-1 bg-rose-100 text-rose-700 text-[10px]">auffällig</Badge>
            )}
          </button>
        </div>

        {step === "assess" && (
          <div className="mt-4">
            <Button onClick={checkVitalsAssessment} className="w-full" variant="brand">
              Auswertung & nächste Schritte planen →
            </Button>
          </div>
        )}
      </Card>

      {/* Schritt 2: Maßnahmen */}
      {(step === "choose" || step === "feedback") && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Pflegerische Maßnahmen</h2>
            {step === "choose" && (
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                Schritt 2: Was tust du <strong className="mx-1">zuerst</strong>?
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">Wähle alle, die du sofort umsetzen würdest:</p>
          <div className="space-y-2">
            {allActions.map((a) => {
              const isCorrect = scenario.correctActions.includes(a);
              const isPicked = pickedActions.has(a);
              let cls = "border-slate-200 dark:border-slate-700";
              if (step === "choose" && isPicked) cls = "border-sky-400 bg-sky-50 dark:bg-sky-900/30";
              if (step === "feedback") {
                if (isCorrect && isPicked) cls = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30";
                else if (isCorrect && !isPicked) cls = "border-rose-300 bg-rose-50/40 dark:bg-rose-900/15";
                else if (!isCorrect && isPicked) cls = "border-amber-400 bg-amber-50 dark:bg-amber-900/30";
              }
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAction(a)}
                  disabled={step !== "choose"}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-sm ${cls} ${step !== "choose" ? "cursor-default" : "cursor-pointer hover:border-sky-300"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      step === "feedback" && isCorrect ? "bg-emerald-500 border-emerald-500" :
                      step === "feedback" && !isCorrect && isPicked ? "bg-amber-500 border-amber-500" :
                      isPicked ? "bg-sky-500 border-sky-500" : "border-slate-300"
                    }`}>
                      {(isPicked || (step === "feedback" && isCorrect)) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1">{a}</span>
                    {step === "feedback" && isCorrect && !isPicked && <Badge className="bg-rose-100 text-rose-700 text-[10px]">verpasst</Badge>}
                    {step === "feedback" && !isCorrect && isPicked && <Badge className="bg-amber-100 text-amber-700 text-[10px]">unnötig/falsch</Badge>}
                  </div>
                </button>
              );
            })}
          </div>

          {step === "choose" && (
            <div className="mt-4">
              <Button onClick={submitActions} className="w-full" variant="brand" disabled={pickedActions.size === 0}>
                Auswertung anzeigen →
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Feedback */}
      {step === "feedback" && (
        <Card className={`border-2 ${score >= 80 ? "border-emerald-300 bg-emerald-50/50" : score >= 50 ? "border-amber-300 bg-amber-50/50" : "border-rose-300 bg-rose-50/50"} dark:bg-opacity-30`}>
          <div className="flex items-center gap-3 mb-3">
            {score >= 80 ? <Trophy className="w-8 h-8 text-amber-500" /> : score >= 50 ? <Stethoscope className="w-8 h-8 text-amber-500" /> : <AlertTriangle className="w-8 h-8 text-rose-500" />}
            <div>
              <div className="text-3xl font-bold">{score}%</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{score >= 80 ? "Sehr gut!" : score >= 50 ? "OK — guck dir die roten Karten an." : "Wiederholungsbedarf."}</div>
            </div>
          </div>
          <div className="text-sm bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 mb-3">
            <div className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-1">Diagnose</div>
            <div>{scenario.diagnosis}</div>
          </div>
          <Button onClick={newCase} className="w-full">
            <Shuffle className="w-4 h-4" /> Nächster Fall
          </Button>
        </Card>
      )}
    </div>
  );
}
