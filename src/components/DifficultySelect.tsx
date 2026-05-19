import { Label } from "@/components/ui/Input";

export const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "leicht", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  2: { label: "mittel", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  3: { label: "schwer", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
};

export function DifficultySelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <Label htmlFor="difficulty">Schwierigkeit</Label>
      <select
        id="difficulty"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
      >
        <option value="">— unbestimmt —</option>
        <option value="1">🟢 leicht</option>
        <option value="2">🟡 mittel</option>
        <option value="3">🔴 schwer</option>
      </select>
    </div>
  );
}
