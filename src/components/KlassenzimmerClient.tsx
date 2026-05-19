"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setTaskDueDate, togglePublishTask, publishTasks, remindNonSubmitters } from "@/lib/actions/tasks";
import { Clock, MapPin, Layers, GraduationCap, Inbox, Calendar, BookMarked, Check, X, PanelRightClose, PanelRightOpen, CalendarPlus, Send, Bell } from "lucide-react";

type Day = { date: string; weekday: number; label: string };
type Slot = {
  id: string; classId: string; weekday: number;
  startTime: string; endTime?: string | null;
  title: string; location?: string | null; topicId?: string | null;
};
type Task = {
  id: string; classId: string; title: string; type: string;
  dueAt?: number | string | null; publishedAt?: number | string | null;
  difficulty?: number | null; examMode?: boolean | number;
};

const TYPE_EMOJI: Record<string, string> = {
  quiz: "❓", flashcards: "🃏", cloze: "✍️", case_study: "🏥", image_hotspot: "🖼️",
};

/**
 * Berechnet die Tab-Hintergrundfarbe je nach Distanz zu heute.
 * Heute = weiß / sehr hell · weitester entfernter Tag = mattes Blau.
 */
function tabStyles(dayIso: string, todayIso: string, maxDistance: number, isActive: boolean) {
  const today = new Date(todayIso + "T00:00:00");
  const day = new Date(dayIso + "T00:00:00");
  const distance = Math.abs(Math.round((day.getTime() - today.getTime()) / 86400000));
  // Normalisiere 0..1
  const t = maxDistance === 0 ? 0 : Math.min(distance / maxDistance, 1);

  // Farbverlauf: heute = #ffffff, weitester = #475569 (matte slate)
  // Light mode interpoliert von weiß → slate
  // Dark mode interpoliert von slate-100 → slate-700
  // RGB-Interpolation
  const todayRGB = [255, 255, 255];
  const farRGB = [71, 85, 105]; // slate-600
  const rgb = todayRGB.map((c, i) => Math.round(c + (farRGB[i] - c) * t));
  const bg = `rgb(${rgb.join(",")})`;
  // Text-Kontrast: hell wenn dunkler Hintergrund
  const luminance = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
  const textColor = luminance < 140 ? "#f1f5f9" : "#0f172a";

  return {
    backgroundColor: bg,
    color: textColor,
    boxShadow: isActive ? "inset 0 -3px 0 #0ea5e9" : "none",
    fontWeight: isActive || distance === 0 ? 600 : 500,
  };
}

export function KlassenzimmerClient({
  days,
  todayIso,
  slots,
  topicMap,
  weekTasks,
  backlog,
  classNameById,
  classColorById,
  memberCount,
  submissionCount,
}: {
  days: Day[];
  todayIso: string;
  slots: Slot[];
  topicMap: Record<string, { id: string; title: string }>;
  weekTasks: Task[];
  backlog: Task[];
  classNameById: Record<string, string>;
  classColorById: Record<string, string>;
  memberCount: Record<string, number>;
  submissionCount: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [activeDay, setActiveDay] = useState<string>(() => {
    const today = days.find((d) => d.date === todayIso);
    return today ? todayIso : days[0]?.date ?? todayIso;
  });
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropHover, setDropHover] = useState<string | null>(null);
  const [pickerForTaskId, setPickerForTaskId] = useState<string | null>(null);

  // Collapse-State (localStorage)
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("klassenzimmer-collapsed") : null;
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  // Auto-Refresh alle 20s, wenn das Panel offen ist und veröffentlichte Aufgaben in der Woche stehen
  const hasLiveTasks = weekTasks.some((t) => !!t.publishedAt);
  useEffect(() => {
    if (collapsed || !hasLiveTasks) return;
    const t = setInterval(() => {
      // Silent refresh — keine Loading-States, nur frische Daten
      if (document.visibilityState === "visible") router.refresh();
    }, 20000);
    return () => clearInterval(t);
  }, [collapsed, hasLiveTasks, router]);
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem("klassenzimmer-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  const maxDistance = useMemo(() => {
    const today = new Date(todayIso + "T00:00:00");
    return days.reduce((acc, d) => {
      const day = new Date(d.date + "T00:00:00");
      return Math.max(acc, Math.abs(Math.round((day.getTime() - today.getTime()) / 86400000)));
    }, 1);
  }, [days, todayIso]);

  // Backlog: nur veröffentlichte zuerst, dann Entwürfe
  const backlogPublished = backlog.filter((b) => !!b.publishedAt);
  const backlogDrafts = backlog.filter((b) => !b.publishedAt);

  // Tasks pro Tag (basierend auf dueAt, lokal)
  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of weekTasks) {
      if (!t.dueAt) continue;
      const d = new Date(t.dueAt);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!m[iso]) m[iso] = [];
      m[iso].push(t);
    }
    return m;
  }, [weekTasks]);

  // Slots pro Tag (Mo-Fr)
  const slotsByDay = useMemo(() => {
    const m: Record<number, Slot[]> = {};
    for (const s of slots) {
      if (s.weekday < 0 || s.weekday > 4) continue;
      if (!m[s.weekday]) m[s.weekday] = [];
      m[s.weekday].push(s);
    }
    return m;
  }, [slots]);

  const activeDayData = days.find((d) => d.date === activeDay)!;
  const daySlots = slotsByDay[activeDayData.weekday] ?? [];
  const dayTasks = tasksByDay[activeDay] ?? [];

  async function onDrop(targetDate: string) {
    if (!dragTaskId) return;
    setDropHover(null);
    start(async () => {
      try {
        // dueAt auf Ende des lokalen Tages — JS interpretiert "T23:59:59" als lokal
        const local = new Date(`${targetDate}T23:59:59`);
        await setTaskDueDate(dragTaskId, local.toISOString());
        setDragTaskId(null);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function clearDueDate(taskId: string) {
    start(async () => {
      try {
        await setTaskDueDate(taskId, null);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function publish(taskId: string) {
    start(async () => {
      try {
        await togglePublishTask(taskId);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function sendDay(taskIds: string[]) {
    if (taskIds.length === 0) return;
    start(async () => {
      try {
        const { published } = await publishTasks({ taskIds });
        router.refresh();
        if (published === 0) {
          alert("Keine neuen Aufgaben zum Senden.");
        }
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function sendSingle(taskId: string) {
    start(async () => {
      try {
        await togglePublishTask(taskId);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  const [remindedFor, setRemindedFor] = useState<string | null>(null);
  async function remindFor(taskId: string) {
    start(async () => {
      try {
        const { reminded } = await remindNonSubmitters(taskId);
        if (reminded === 0) {
          alert("Alle haben schon abgegeben — niemand zu erinnern.");
        } else {
          setRemindedFor(taskId);
          setTimeout(() => setRemindedFor((id) => id === taskId ? null : id), 3000);
        }
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function assignToDate(taskId: string, targetDate: string) {
    setPickerForTaskId(null);
    start(async () => {
      try {
        const local = new Date(`${targetDate}T23:59:59`);
        await setTaskDueDate(taskId, local.toISOString());
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  // Eingeklappte Schmalansicht
  if (hydrated && collapsed) {
    return (
      <aside className="hidden xl:flex flex-col w-10 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 sticky top-0 h-screen items-center py-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-8 h-8 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
          title="Klassenzimmer ausklappen"
          aria-label="Klassenzimmer ausklappen"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        <div className="mt-3 flex-1 flex items-center">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 [writing-mode:vertical-rl] rotate-180">
            Klassenzimmer
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 sticky top-0 h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" />
              <h2 className="font-bold text-sm tracking-tight">Klassenzimmer</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Wochenplan & Aufgaben-Zuordnung</p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex-shrink-0"
            title="Klassenzimmer einklappen"
            aria-label="Klassenzimmer einklappen"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab-Leiste */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {days.map((d) => {
          const isActive = d.date === activeDay;
          const isToday = d.date === todayIso;
          const styles = tabStyles(d.date, todayIso, maxDistance, isActive);
          const taskCount = (tasksByDay[d.date] ?? []).length;
          const slotCount = (slotsByDay[d.weekday] ?? []).length;
          const isHover = dropHover === d.date;
          const dateLabel = new Date(d.date + "T00:00:00").getDate();
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setActiveDay(d.date)}
              onDragOver={(e) => { if (dragTaskId) { e.preventDefault(); setDropHover(d.date); } }}
              onDragLeave={() => setDropHover((h) => h === d.date ? null : h)}
              onDrop={(e) => { e.preventDefault(); onDrop(d.date); }}
              className={`flex-1 px-1 py-2 text-xs transition-all relative ${
                isHover ? "ring-2 ring-inset ring-emerald-400 ring-offset-0" : ""
              }`}
              style={styles}
              title={d.date}
            >
              <div className="flex flex-col items-center gap-0">
                <span className="text-[10px] uppercase tracking-wider opacity-80">{d.label}</span>
                <span className="text-base leading-tight font-bold">{dateLabel}</span>
                <div className="flex items-center gap-0.5 mt-0.5 h-2">
                  {slotCount > 0 && <span className="w-1 h-1 rounded-full bg-sky-500" title={`${slotCount} Slots`} />}
                  {taskCount > 0 && <span className="w-1 h-1 rounded-full bg-violet-500" title={`${taskCount} Aufgaben`} />}
                </div>
              </div>
              {isToday && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" title="heute" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tagesansicht */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(activeDay + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>

        {/* Stundenplan-Slots */}
        <section>
          <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Stundenplan
          </h3>
          {daySlots.length === 0 ? (
            <p className="text-xs text-slate-400 italic">kein Unterricht</p>
          ) : (
            <ul className="space-y-1">
              {daySlots.map((s) => {
                const klassName = classNameById[s.classId];
                const klassColor = classColorById[s.classId];
                const topic = s.topicId ? topicMap[s.topicId] : null;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/klassen/${s.classId}`}
                      className="block p-2 rounded-md bg-white dark:bg-slate-900 border-l-4 border border-slate-200 dark:border-slate-700 text-xs hover:shadow-sm transition"
                      style={{ borderLeftColor: klassColor ?? "#888" }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-slate-500">{s.startTime}</span>
                        {s.location && (
                          <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {s.location}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm leading-tight mt-0.5">{s.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span style={{ color: klassColor ?? undefined }}>{klassName}</span>
                        {topic && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5"><BookMarked className="w-2.5 h-2.5" />{topic.title}</span>
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Fällige Aufgaben */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3" /> Fällige Aufgaben
            </h3>
            {dayTasks.length > 0 && (() => {
              const unpub = dayTasks.filter((t) => !t.publishedAt);
              if (unpub.length === 0) return (
                <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> alle gesendet
                </span>
              );
              return (
                <button
                  type="button"
                  onClick={() => sendDay(unpub.map((t) => t.id))}
                  disabled={pending}
                  className="text-[10px] font-semibold inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                  title={`${unpub.length} Aufgaben an Schüler:innen freigeben`}
                >
                  <Send className="w-2.5 h-2.5" /> {unpub.length} senden
                </button>
              );
            })()}
          </div>
          {dayTasks.length === 0 ? (
            <div
              className={`text-xs text-slate-400 italic p-3 border-2 border-dashed rounded-lg text-center transition ${
                dragTaskId ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700"
              }`}
              onDragOver={(e) => { if (dragTaskId) { e.preventDefault(); } }}
              onDrop={(e) => { e.preventDefault(); onDrop(activeDay); }}
            >
              {dragTaskId ? "📥 Hier ablegen, um Fälligkeit zu setzen" : "keine Aufgabe für diesen Tag"}
            </div>
          ) : (
            <ul className="space-y-1">
              {dayTasks.map((t) => {
                const klassName = classNameById[t.classId];
                const klassColor = classColorById[t.classId];
                const subs = submissionCount[t.id] ?? 0;
                const members = memberCount[t.classId] ?? 0;
                const ratio = members > 0 ? subs / members : 0;
                const ratioColor = ratio === 0 ? "text-rose-500" : ratio < 1 ? "text-amber-500" : "text-emerald-600";
                const isPublished = !!t.publishedAt;
                return (
                  <li key={t.id}>
                    <div
                      className={`block p-2 rounded-md border-l-4 border text-xs transition ${
                        isPublished
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                          : "bg-amber-50/60 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700"
                      }`}
                      style={{ borderLeftColor: klassColor ?? "#888" }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <Link href={`/aufgaben/${t.id}/bearbeiten`} className="font-medium leading-tight flex-1 min-w-0 hover:underline">
                          <span className="mr-1">{TYPE_EMOJI[t.type] ?? "📝"}</span>{t.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => clearDueDate(t.id)}
                          disabled={pending}
                          className="text-slate-300 hover:text-rose-500 flex-shrink-0"
                          title="Fälligkeit entfernen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] mt-1 flex items-center justify-between gap-1">
                        <span style={{ color: klassColor ?? undefined }} className="truncate">{klassName}</span>
                        {isPublished ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-semibold ${ratioColor}`}>{subs}/{members}</span>
                            {subs < members && (
                              remindedFor === t.id ? (
                                <span className="text-emerald-600 inline-flex items-center gap-0.5" title="Erinnerung gesendet">
                                  <Check className="w-2.5 h-2.5" /> erinnert
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => remindFor(t.id)}
                                  disabled={pending}
                                  className="text-slate-400 hover:text-amber-500 disabled:opacity-50"
                                  title={`${members - subs} Schüler:innen ohne Abgabe erinnern`}
                                  aria-label="Erinnerung senden"
                                >
                                  <Bell className="w-3 h-3" />
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => sendSingle(t.id)}
                            disabled={pending}
                            className="font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                            title="Diese Aufgabe an Schüler:innen freigeben"
                          >
                            <Send className="w-2.5 h-2.5" /> Senden
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Backlog */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-72 flex flex-col">
        <div className="px-3 py-2 flex items-center justify-between flex-shrink-0">
          <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
            <Inbox className="w-3 h-3" /> Backlog
          </h3>
          <span className="text-[10px] text-slate-400">{backlogPublished.length + backlogDrafts.length}</span>
        </div>
        <div className="overflow-y-auto px-3 pb-3 space-y-1 flex-1 min-h-0">
          {backlogPublished.length === 0 && backlogDrafts.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">Nichts zu planen 🎉</p>
          ) : (
            <>
              {backlogPublished.map((t) => (
                <BacklogItem
                  key={t.id}
                  task={t}
                  klassName={classNameById[t.classId]}
                  klassColor={classColorById[t.classId]}
                  isDraft={false}
                  pending={pending}
                  pickerOpen={pickerForTaskId === t.id}
                  days={days}
                  todayIso={todayIso}
                  onDragStart={() => setDragTaskId(t.id)}
                  onDragEnd={() => { setDragTaskId(null); setDropHover(null); }}
                  onOpenPicker={() => setPickerForTaskId(t.id)}
                  onClosePicker={() => setPickerForTaskId(null)}
                  onPickDate={(d) => assignToDate(t.id, d)}
                />
              ))}
              {backlogDrafts.length > 0 && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wider pt-2">Entwürfe</p>
              )}
              {backlogDrafts.map((t) => (
                <BacklogItem
                  key={t.id}
                  task={t}
                  klassName={classNameById[t.classId]}
                  klassColor={classColorById[t.classId]}
                  isDraft={true}
                  pending={pending}
                  pickerOpen={pickerForTaskId === t.id}
                  days={days}
                  todayIso={todayIso}
                  onDragStart={() => setDragTaskId(t.id)}
                  onDragEnd={() => { setDragTaskId(null); setDropHover(null); }}
                  onOpenPicker={() => setPickerForTaskId(t.id)}
                  onClosePicker={() => setPickerForTaskId(null)}
                  onPickDate={(d) => assignToDate(t.id, d)}
                  onPublish={() => publish(t.id)}
                />
              ))}
            </>
          )}
        </div>
        <p className="text-[10px] text-slate-400 text-center px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          Ziehe Aufgaben auf einen Tag oben
        </p>
      </div>
    </aside>
  );
}

function BacklogItem({
  task,
  klassName,
  klassColor,
  isDraft,
  pending,
  pickerOpen,
  days,
  todayIso,
  onDragStart,
  onDragEnd,
  onOpenPicker,
  onClosePicker,
  onPickDate,
  onPublish,
}: {
  task: Task;
  klassName?: string;
  klassColor?: string;
  isDraft: boolean;
  pending: boolean;
  pickerOpen: boolean;
  days: Day[];
  todayIso: string;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onPickDate: (date: string) => void;
  onPublish?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      className={`p-2 rounded-md border-l-4 border text-xs hover:shadow-sm transition bg-slate-50 dark:bg-slate-800 ${
        isDraft ? "border-dashed border-slate-300 dark:border-slate-700" : "border-slate-200 dark:border-slate-700"
      } ${pickerOpen ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={{ borderLeftColor: klassColor ?? "#888" }}
      title={`${task.title} — ziehe auf einen Tag oben oder nutze den Kalender-Knopf`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-medium leading-tight flex-1 min-w-0">
          <span className="mr-1">{TYPE_EMOJI[task.type] ?? "📝"}</span>{task.title}
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); pickerOpen ? onClosePicker() : onOpenPicker(); }}
          disabled={pending}
          className="text-slate-400 hover:text-sky-600 flex-shrink-0"
          title="Tag wählen"
          aria-label="Tag wählen"
        >
          <CalendarPlus className="w-3 h-3" />
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-2 p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex gap-1">
          {days.map((d) => {
            const isToday = d.date === todayIso;
            const dateNum = new Date(d.date + "T00:00:00").getDate();
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => onPickDate(d.date)}
                disabled={pending}
                className={`flex-1 py-1 px-1 rounded text-[10px] font-medium transition ${
                  isToday
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-slate-600 dark:text-slate-300"
                }`}
                title={d.date}
              >
                <div>{d.label}</div>
                <div className="font-bold">{dateNum}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
        <span style={{ color: klassColor ?? undefined }}>{klassName ?? "—"}</span>
        {isDraft && onPublish && (
          <button
            type="button"
            onClick={onPublish}
            disabled={pending}
            className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-0.5"
            title="Veröffentlichen"
          >
            <Check className="w-2.5 h-2.5" /> publish
          </button>
        )}
        {!isDraft && <span className="text-emerald-600">veröffentlicht</span>}
      </div>
    </div>
  );
}
