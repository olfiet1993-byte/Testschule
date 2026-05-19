import { Label } from "@/components/ui/Input";

export function TopicSelect({
  topics,
  classId,
  value,
  onChange,
}: {
  topics: any[];
  classId: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const available = topics.filter((t) => t.classId === classId);
  return (
    <div>
      <Label htmlFor="topicId">Thema (optional)</Label>
      <select
        id="topicId"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
      >
        <option value="">— ohne Thema —</option>
        {available.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>
      {available.length === 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Keine Themen in dieser Klasse — Themen verwaltest du auf der Klassen-Detail-Seite.
        </p>
      )}
    </div>
  );
}
