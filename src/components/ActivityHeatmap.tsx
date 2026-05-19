/**
 * GitHub-style Aktivitäts-Heatmap.
 * Zeigt die letzten 12 Wochen, Wochentage als Spalten — Intensität entsprechend
 * der Aktivität (Anzahl Submissions an dem Tag).
 */

export type Activity = { date: string; count: number };

export function ActivityHeatmap({ activities }: { activities: Activity[] }) {
  // Map: yyyy-mm-dd → count
  const map = new Map(activities.map((a) => [a.date, a.count]));

  // Letzte 12 Wochen (84 Tage), endend mit heute
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Array<{ date: Date; count: number }> = [];
  for (let i = 12 * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, count: map.get(key) ?? 0 });
  }

  // Spalten = Wochen, beginnend so dass die erste Spalte mit Montag startet.
  // Berechne den Wochentag (0=So..6=Sa) des ersten Tages, dann ggf. Auffüllung.
  // Wir machen es einfach: rows = Mo..So (7 rows), columns = weeks.
  const weeks: Array<Array<{ date: Date; count: number } | null>> = [];
  let currentWeek: Array<{ date: Date; count: number } | null> = new Array(7).fill(null);

  for (const day of days) {
    const weekday = (day.date.getDay() + 6) % 7; // Mo=0..So=6
    currentWeek[weekday] = day;
    if (weekday === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }
  if (currentWeek.some((d) => d !== null)) weeks.push(currentWeek);

  function cellColor(count: number): string {
    if (count === 0) return "bg-slate-100 dark:bg-slate-800";
    if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
    if (count <= 3) return "bg-emerald-400 dark:bg-emerald-700";
    if (count <= 5) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-500";
  }

  const total = activities.reduce((a, b) => a + b.count, 0);
  const daysActive = activities.filter((a) => a.count > 0).length;
  const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  // Show month label above first week where the month changes
  let lastMonth = -1;

  return (
    <div>
      <div className="mb-2 flex justify-between items-baseline">
        <span className="text-sm">
          <strong>{total}</strong> Aktivitäten an <strong>{daysActive}</strong> Tagen (letzte 12 Wochen)
        </span>
      </div>
      <div className="flex gap-1 text-[10px] font-mono mb-1 pl-7">
        {weeks.map((w, i) => {
          const firstDay = w.find((d) => d !== null);
          if (!firstDay) return <div key={i} className="w-3"></div>;
          const m = firstDay.date.getMonth();
          const showLabel = m !== lastMonth;
          lastMonth = m;
          return (
            <div key={i} className="w-3 text-slate-500">
              {showLabel ? monthLabels[m] : ""}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 text-[10px] text-slate-500 pr-1 mt-0.5">
          <div className="h-3 leading-3">Mo</div>
          <div className="h-3 leading-3"></div>
          <div className="h-3 leading-3">Mi</div>
          <div className="h-3 leading-3"></div>
          <div className="h-3 leading-3">Fr</div>
          <div className="h-3 leading-3"></div>
          <div className="h-3 leading-3">So</div>
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${day ? cellColor(day.count) : "bg-transparent"}`}
                  title={day ? `${day.date.toLocaleDateString("de-DE")}: ${day.count} ${day.count === 1 ? "Aufgabe" : "Aufgaben"}` : ""}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-500">
        <span>weniger</span>
        <span className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
        <span className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <span className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <span className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
        <span className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>mehr</span>
      </div>
    </div>
  );
}
