"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  submitFeedback,
  toggleFeedbackVote,
  updateFeedbackStatus,
  deleteFeedback,
} from "@/lib/actions/feedback";
import {
  Lightbulb,
  Bug,
  HelpCircle,
  MessageSquare,
  ThumbsUp,
  ChevronUp,
  CheckCircle2,
  Clock,
  X,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";

type FbType = "idea" | "bug" | "question" | "other";
type FbStatus = "open" | "planned" | "in_progress" | "done" | "wontfix";

type Item = {
  id: string;
  userId: string;
  type: FbType;
  title: string;
  body: string;
  status: FbStatus;
  response?: string | null;
  respondedBy?: string | null;
  respondedAt?: number | string | null;
  createdAt: number | string;
};

type UserInfo = { displayName: string; avatarEmoji?: string | null; avatarColor?: string | null; role: string };

const TYPE_META: Record<FbType, { label: string; color: string; icon: any }> = {
  idea: { label: "Idee", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Lightbulb },
  bug: { label: "Bug", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", icon: Bug },
  question: { label: "Frage", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", icon: HelpCircle },
  other: { label: "Sonst.", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: MessageSquare },
};

const STATUS_META: Record<FbStatus, { label: string; color: string }> = {
  open: { label: "offen", color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  planned: { label: "geplant", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  in_progress: { label: "in Arbeit", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  done: { label: "umgesetzt", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  wontfix: { label: "abgelehnt", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

function fmtDate(ts: number | string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function FeedbackBoard({
  items,
  voteCount,
  myVotes,
  userMap,
  myUserId,
  myRole,
}: {
  items: Item[];
  voteCount: Record<string, number>;
  myVotes: string[];
  userMap: Record<string, UserInfo>;
  myUserId: string;
  myRole: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<FbType>("idea");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<"all" | FbStatus>("all");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<FbStatus>("planned");

  const myVoteSet = useMemo(() => new Set(myVotes), [myVotes]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (filter !== "all") arr = arr.filter((i) => i.status === filter);
    // Sortierung: offene zuerst nach Votes, dann andere nach Datum
    arr.sort((a, b) => {
      const aActive = a.status === "open" || a.status === "planned" || a.status === "in_progress";
      const bActive = b.status === "open" || b.status === "planned" || b.status === "in_progress";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      const vd = (voteCount[b.id] ?? 0) - (voteCount[a.id] ?? 0);
      if (vd !== 0) return vd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [items, filter, voteCount]);

  async function submit() {
    if (!title.trim() || !body.trim()) return alert("Titel und Beschreibung sind nötig");
    start(async () => {
      try {
        await submitFeedback({ type, title, body });
        setTitle("");
        setBody("");
        setShowForm(false);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function vote(id: string) {
    start(async () => {
      try {
        await toggleFeedbackVote(id);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function saveResponse(id: string) {
    start(async () => {
      try {
        await updateFeedbackStatus({
          feedbackId: id,
          status: newStatus,
          response: responseText,
        });
        setRespondingTo(null);
        setResponseText("");
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function quickStatus(id: string, status: FbStatus) {
    start(async () => {
      try {
        await updateFeedbackStatus({ feedbackId: id, status });
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  async function doDelete(id: string) {
    if (!confirm("Feedback wirklich löschen?")) return;
    start(async () => {
      try {
        await deleteFeedback(id);
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ideen & Feedback</h1>
            <p className="text-sm text-slate-500">
              Was sollten wir verbessern? Hier sammeln wir Vorschläge — die mit den meisten Stimmen kommen zuerst dran.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="w-4 h-4" /> Schließen</> : <><Plus className="w-4 h-4" /> Idee einreichen</>}
        </Button>
      </div>

      {showForm && (
        <Card className="border-amber-200">
          <h3 className="font-semibold mb-3">Neues Feedback</h3>
          <div className="space-y-3">
            <div>
              <Label>Art</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {(Object.keys(TYPE_META) as FbType[]).map((t) => {
                  const M = TYPE_META[t];
                  const I = M.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5 transition ${
                        active ? M.color + " ring-2 ring-offset-1 ring-current" : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <I className="w-4 h-4" /> {M.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="fb-title">Kurzer Titel</Label>
              <Input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Dunkler Modus für Druckansicht"
                maxLength={120}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fb-body">Beschreibung</Label>
              <textarea
                id="fb-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Was genau soll passieren? Welches Problem löst es?"
                rows={4}
                maxLength={4000}
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={pending} className="flex-1">
                {pending ? "Senden…" : "Absenden"}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Abbrechen</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-1 flex-wrap text-xs">
        {(["all", "open", "planned", "in_progress", "done", "wontfix"] as const).map((s) => {
          const active = filter === s;
          const count = s === "all" ? items.length : items.filter((i) => i.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s === "all" ? "Alle" : STATUS_META[s].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card className="text-center py-10">
          <Lightbulb className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Ideen{filter !== "all" ? ` mit Status "${STATUS_META[filter].label}"` : ""}.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const TM = TYPE_META[f.type];
            const SM = STATUS_META[f.status];
            const I = TM.icon;
            const author = userMap[f.userId];
            const responder = f.respondedBy ? userMap[f.respondedBy] : null;
            const myVote = myVoteSet.has(f.id);
            const votes = voteCount[f.id] ?? 0;
            const canDelete = f.userId === myUserId || myRole === "teacher" || myRole === "admin";
            const isTeacher = myRole === "teacher" || myRole === "admin";
            return (
              <Card key={f.id}>
                <div className="flex items-start gap-3">
                  {/* Vote-Spalte */}
                  <button
                    type="button"
                    onClick={() => vote(f.id)}
                    disabled={pending}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition flex-shrink-0 ${
                      myVote
                        ? "bg-sky-50 dark:bg-sky-900/30 border-sky-300 text-sky-700 dark:text-sky-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-sky-300 hover:text-sky-600"
                    }`}
                    title={myVote ? "Stimme entfernen" : "Idee unterstützen"}
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span className="text-xs font-bold leading-none">{votes}</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                        <Badge className={TM.color}>
                          <I className="w-3 h-3 mr-0.5 inline" /> {TM.label}
                        </Badge>
                        <Badge className={SM.color}>{SM.label}</Badge>
                        <span>{f.title}</span>
                      </h3>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => doDelete(f.id)}
                          className="text-slate-400 hover:text-rose-500"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2">{f.body}</p>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span style={{ color: author?.avatarColor ?? undefined }}>
                        {author?.avatarEmoji ?? "👤"} {author?.displayName ?? "Unbekannt"}
                      </span>
                      <span>·</span>
                      <Calendar className="w-3 h-3 inline" /> {fmtDate(f.createdAt)}
                    </div>

                    {/* Antwort vom Team */}
                    {f.response && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-400">
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Antwort{responder ? ` von ${responder.displayName}` : ""}
                          {f.respondedAt && <span className="text-slate-500 font-normal">· {fmtDate(f.respondedAt)}</span>}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{f.response}</p>
                      </div>
                    )}

                    {/* Lehrer-Aktionen */}
                    {isTeacher && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {respondingTo === f.id ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Status:</Label>
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as FbStatus)}
                                className="text-xs px-2 py-1 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              >
                                {(Object.keys(STATUS_META) as FbStatus[]).map((s) => (
                                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                                ))}
                              </select>
                            </div>
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Antwort an die Community (optional)…"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveResponse(f.id)} disabled={pending}>
                                Speichern
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => { setRespondingTo(null); setResponseText(""); }}>
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1 flex-wrap text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingTo(f.id);
                                setResponseText(f.response ?? "");
                                setNewStatus(f.status);
                              }}
                              className="px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 hover:bg-sky-200"
                            >
                              Antworten & Status setzen
                            </button>
                            {f.status !== "planned" && (
                              <button type="button" onClick={() => quickStatus(f.id, "planned")} className="px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 hover:bg-violet-200">
                                geplant
                              </button>
                            )}
                            {f.status !== "in_progress" && (
                              <button type="button" onClick={() => quickStatus(f.id, "in_progress")} className="px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 hover:bg-sky-200">
                                <Clock className="w-3 h-3 inline" /> in Arbeit
                              </button>
                            )}
                            {f.status !== "done" && (
                              <button type="button" onClick={() => quickStatus(f.id, "done")} className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 hover:bg-emerald-200">
                                <CheckCircle2 className="w-3 h-3 inline" /> umgesetzt
                              </button>
                            )}
                            {f.status !== "wontfix" && (
                              <button type="button" onClick={() => quickStatus(f.id, "wontfix")} className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 hover:bg-rose-200">
                                ablehnen
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
