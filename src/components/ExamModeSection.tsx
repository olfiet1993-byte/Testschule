"use client";

import { Card, Label, Input } from "@/components/ui/Input";
import { GraduationCap } from "lucide-react";

export function ExamModeSection({
  examMode,
  setExamMode,
  timeLimitMinutes,
  setTimeLimitMinutes,
}: {
  examMode: boolean;
  setExamMode: (v: boolean) => void;
  timeLimitMinutes: number | null;
  setTimeLimitMinutes: (v: number | null) => void;
}) {
  return (
    <Card className={examMode ? "border-rose-300 bg-rose-50/30 dark:bg-rose-900/10" : ""}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={examMode}
          onChange={(e) => setExamMode(e.target.checked)}
          className="mt-1 w-4 h-4 accent-rose-500"
        />
        <div className="flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-rose-500" />
            Klausur-Modus
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Nur <strong>ein Versuch</strong> pro Schüler:in. Die korrekten Antworten bleiben verborgen,
            bis du sie aktiv freigibst. Optionales Zeitlimit ab Start.
          </p>
        </div>
      </label>

      {examMode && (
        <div className="mt-3 pl-7">
          <Label htmlFor="timeLimit">Zeitlimit pro Schüler (Minuten, optional)</Label>
          <Input
            id="timeLimit"
            type="number"
            min={1}
            max={300}
            value={timeLimitMinutes ?? ""}
            placeholder="z. B. 45"
            onChange={(e) => {
              const v = e.target.value;
              setTimeLimitMinutes(v ? Number(v) : null);
            }}
            className="mt-1 max-w-[120px]"
          />
        </div>
      )}
    </Card>
  );
}
