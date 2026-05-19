"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addSlot, deleteSlot } from "@/lib/actions/schedule";
import { ArrowLeft, Plus, Trash2, Clock, MapPin, BookMarked, CalendarDays } from "lucide-react";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function StundenplanClient({
  klass,
  slots,
  topics,
}: {
  klass: any;
  slots: any[];
  topics: any[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [topicId, setTopicId] = useState<string>("");
  const [location, setLocation] = useState("");

  function submit() {
    if (!title.trim()) return;
    start(async () => {
      try {
        await addSlot({
          classId: klass.id,
          weekday,
          startTime,
          endTime: endTime || undefined,
          title,
          topicId: topicId || null,
          location: location || null,
        });
        setTitle("");
        setLocation("");
        setOpen(false);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  // Slots nach Wochentag gruppieren
  const byDay: Record<number, any[]> = {};
  for (const s of slots) {
    if (!byDay[s.weekday]) byDay[s.weekday] = [];
    byDay[s.weekday].push(s);
  }

  return (
    <>
      <Link href={`/klassen/${klass.id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu {klass.name}
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: klass.color }} />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-sky-500" />
              Stundenplan
            </h1>
            <p className="text-sm text-slate-500">{klass.name}</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} disabled={open}>
          <Plus className="w-4 h-4" /> Neue Stunde
        </Button>
      </div>

      {open && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Neue Stunde</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Titel</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Anatomie" className="mt-1" />
            </div>
            <div>
              <Label>Wochentag</Label>
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}
                className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
                {WEEKDAYS_LONG.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label>Beginn</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Ende (optional)</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Thema (optional)</Label>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}
                className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm">
                <option value="">— kein Thema —</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Ort (optional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="z. B. Raum 204" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1">Abbrechen</Button>
            <Button onClick={submit} disabled={pending || !title.trim()} className="flex-1">Hinzufügen</Button>
          </div>
        </Card>
      )}

      {slots.length === 0 ? (
        <Card className="text-center py-10">
          <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch kein Stundenplan — füge die erste Stunde hinzu.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {WEEKDAYS.map((dayShort, dayIdx) => {
            const daySlots = byDay[dayIdx] ?? [];
            if (daySlots.length === 0) return null;
            return (
              <Card key={dayIdx}>
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-500">{WEEKDAYS_LONG[dayIdx]}</h3>
                <ul className="space-y-2">
                  {daySlots.map((s) => {
                    const topic = topics.find((t) => t.id === s.topicId);
                    return (
                      <li
                        key={s.id}
                        className="p-3 rounded-lg border-l-4 bg-slate-50 dark:bg-slate-800/50 group"
                        style={{ borderLeftColor: klass.color }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              {s.startTime}{s.endTime && ` – ${s.endTime}`}
                            </div>
                            <div className="font-medium text-sm">{s.title}</div>
                            {topic && (
                              <div className="text-xs text-violet-600 dark:text-violet-400 inline-flex items-center gap-1 mt-1">
                                <BookMarked className="w-3 h-3" /> {topic.title}
                              </div>
                            )}
                            {s.location && (
                              <div className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1 ml-2">
                                <MapPin className="w-3 h-3" /> {s.location}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Stunde "${s.title}" löschen?`)) start(() => { deleteSlot(s.id); });
                            }}
                            className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
