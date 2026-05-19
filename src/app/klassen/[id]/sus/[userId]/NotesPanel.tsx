"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addStudentNote, updateStudentNote, deleteStudentNote } from "@/lib/actions/studentNotes";
import { StickyNote, Plus, Save, Trash2, Pencil, X, Lock } from "lucide-react";

type Note = {
  id: string;
  body: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  authorId: string;
  authorName: string;
};

function fmtDate(d: Date | string): string {
  const dd = typeof d === "string" ? new Date(d) : d;
  return dd.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function NotesPanel({
  studentId,
  currentUserId,
  initialNotes,
}: {
  studentId: string;
  currentUserId: string;
  initialNotes: Note[];
}) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [adding, setAdding] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  function handleAdd() {
    if (!newBody.trim()) return;
    const body = newBody;
    start(async () => {
      try {
        await addStudentNote({ studentId, body });
        // optimistic update: kompletter Refresh via Router würde besser sein,
        // hier reicht: aktuell Note dazu mit Server-Zeit
        const tempNote: Note = {
          id: "tmp-" + Date.now(),
          body,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorId: currentUserId,
          authorName: "Du",
        };
        setNotes((n) => [tempNote, ...n]);
        setNewBody("");
        setAdding(false);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function startEdit(n: Note) {
    setEditingId(n.id);
    setEditBody(n.body);
  }

  function saveEdit(id: string) {
    if (!editBody.trim()) return;
    const body = editBody;
    start(async () => {
      try {
        await updateStudentNote({ noteId: id, body });
        setNotes((ns) =>
          ns.map((n) => (n.id === id ? { ...n, body, updatedAt: new Date() } : n)),
        );
        setEditingId(null);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Notiz löschen?")) return;
    start(async () => {
      try {
        await deleteStudentNote(id);
        setNotes((ns) => ns.filter((n) => n.id !== id));
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" /> Lehrer-Notizen
          <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-normal">
            <Lock className="w-3 h-3" /> nur für Lehrkräfte sichtbar
          </span>
        </h3>
        {!adding && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Notiz
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            placeholder="Beobachtung, Hinweis, Verabredung…"
            className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setNewBody(""); }} className="flex-1">
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={pending || !newBody.trim()} className="flex-1">
              <Save className="w-4 h-4" /> Speichern
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Noch keine Notizen.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => {
            const mine = n.authorId === currentUserId;
            const isEditing = editingId === n.id;
            return (
              <li key={n.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                {isEditing ? (
                  <>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} className="flex-1">
                        <X className="w-4 h-4" /> Abbrechen
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(n.id)} disabled={pending} className="flex-1">
                        <Save className="w-4 h-4" /> Speichern
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap mb-2">{n.body}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {n.authorName === "Du" ? "Du" : n.authorName} · {fmtDate(n.updatedAt)}
                      </span>
                      {mine && (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(n)} className="hover:text-sky-600" title="Bearbeiten">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(n.id)} className="hover:text-rose-600" title="Löschen">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
