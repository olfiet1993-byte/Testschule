"use client";

import { useState, useTransition } from "react";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  addStudentManually, removeStudent, createGroupsForClass, deleteGroup,
  moveStudentToGroup, regenerateInviteCode, deleteClass,
} from "@/lib/actions/classes";
import {
  Users, Copy, RefreshCw, Trash2, Shuffle, UserPlus, Sparkles, X, TrendingUp,
  BookMarked, ChevronUp, ChevronDown, Pencil, Check, Plus, MessageCircle, Activity, CalendarDays, Map, Heart, Layers,
} from "lucide-react";
import Link from "next/link";
import { createTopic, updateTopic, deleteTopic, moveTopic } from "@/lib/actions/topics";
import { addCoTeacher, removeCoTeacher, transferClassOwnership } from "@/lib/actions/coTeacher";
import { bulkAddStudents } from "@/lib/actions/classes";
import { Avatar } from "@/components/Avatar";
import { Upload } from "lucide-react";
import { levelTitle } from "@/lib/utils";
import { ClassQrCard } from "@/components/ClassQrCard";

type Props = {
  klass: any;
  members: any[];
  groups: any[];
  groupMembers: any[];
  topics: any[];
  taskCountByTopic: Record<string, number>;
  unassignedTaskCount: number;
  isOwner: boolean;
  owner: any;
  coTeachers: any[];
  availableTeachers: any[];
};

export function ClassDetailClient({
  klass, members, groups, groupMembers,
  topics, taskCountByTopic, unassignedTaskCount,
  isOwner, owner, coTeachers, availableTeachers,
}: Props) {
  const [pending, start] = useTransition();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const groupOf = (userId: string) =>
    groupMembers.find((gm) => gm.userId === userId)?.groupId ?? null;
  const groupedIds = new Set(groupMembers.map((gm) => gm.userId));
  const ungrouped = members.filter((m) => !groupedIds.has(m.id));

  function copyCode() {
    navigator.clipboard.writeText(klass.inviteCode);
  }

  return (
    <>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: klass.color }} />
          <div>
            <h1 className="text-2xl font-bold">{klass.name}</h1>
            <p className="text-sm text-slate-500">{klass.yearGroup?.name ?? "—"} · {members.length} SuS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/klassen/${klass.id}/stundenplan`}>
            <Button variant="secondary" size="sm">
              <CalendarDays className="w-4 h-4" /> Plan
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/forum`}>
            <Button variant="secondary" size="sm">
              <MessageCircle className="w-4 h-4" /> Forum
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/aktivitaet`}>
            <Button variant="secondary" size="sm">
              <Activity className="w-4 h-4" /> Aktivität
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/lernpfade`}>
            <Button variant="secondary" size="sm">
              <Map className="w-4 h-4" /> Lernpfade
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/vitalsim`}>
            <Button variant="secondary" size="sm">
              <Heart className="w-4 h-4" /> Vital-Fälle
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/karteikarten`}>
            <Button variant="secondary" size="sm">
              <Layers className="w-4 h-4" /> Karteikarten
            </Button>
          </Link>
          <Link href={`/klassen/${klass.id}/statistik`}>
            <Button variant="secondary" size="sm">
              <TrendingUp className="w-4 h-4" /> Statistik
            </Button>
          </Link>
          <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-2">
            <span className="text-xs text-slate-500">Code:</span>
            <span className="font-mono font-bold">{klass.inviteCode}</span>
            <button onClick={copyCode} title="Kopieren" className="hover:text-sky-600">
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => start(() => { regenerateInviteCode(klass.id); })}
              disabled={pending}
              title="Neuen Code generieren"
              className="hover:text-sky-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm(`Klasse "${klass.name}" wirklich löschen?`)) {
                start(() => { deleteClass(klass.id); });
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <ClassQrCard
          inviteCode={klass.inviteCode}
          className={klass.name}
          teacherName={owner?.displayName}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Schüler:innen ({members.length})
            </h2>
            <button
              onClick={() => setImportOpen(true)}
              className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
              title="Klassenliste importieren"
            >
              <Upload className="w-3 h-3" /> Liste importieren
            </button>
          </div>

          <form
            className="flex gap-2 mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newStudentName.trim()) return;
              start(async () => {
                await addStudentManually(klass.id, newStudentName);
                setNewStudentName("");
              });
            }}
          >
            <Input
              placeholder="Name hinzufügen…"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
            />
            <Button type="submit" disabled={pending}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </form>

          {members.length === 0 ? (
            <p className="text-sm text-slate-500">
              Schüler können sich mit Code <code>{klass.inviteCode}</code> selbst anmelden — oder hier manuell hinzufügen.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {members.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                  <Link
                    href={`/klassen/${klass.id}/sus/${m.id}`}
                    className="flex-1 min-w-0 hover:text-sky-600 transition flex items-center gap-2"
                  >
                    <Avatar user={m} size={32} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{m.displayName}</div>
                      <div className="text-xs text-slate-500">{levelTitle(m.level)} · Lvl {m.level} · {m.xp} XP</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`${m.displayName} aus Klasse entfernen?`)) {
                        start(() => { removeStudent(klass.id, m.id); });
                      }
                    }}
                    className="text-slate-400 hover:text-rose-500 flex-shrink-0"
                    title="Aus Klasse entfernen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Gruppen ({groups.length})
            </h2>
            <Button size="sm" onClick={() => setShowGroupModal(true)} disabled={members.length === 0}>
              <Shuffle className="w-4 h-4" /> Bilden
            </Button>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-slate-500">
              {members.length === 0
                ? "Erst Schüler hinzufügen."
                : "Noch keine Gruppen — klicke 'Bilden' für zufällige oder manuelle Gruppen."}
            </p>
          ) : (
            <GroupDragBoard
              klassId={klass.id}
              groups={groups}
              groupMembers={groupMembers}
              memberById={memberById}
              ungrouped={ungrouped}
              onDelete={(gid) => start(() => { deleteGroup(gid, klass.id); })}
            />
          )}
        </Card>

        <TopicsCard
          klassId={klass.id}
          topics={topics}
          taskCountByTopic={taskCountByTopic}
          unassignedTaskCount={unassignedTaskCount}
        />

        <CoTeacherCard
          klassId={klass.id}
          isOwner={isOwner}
          owner={owner}
          coTeachers={coTeachers}
          availableTeachers={availableTeachers}
        />
      </div>

      {importOpen && (
        <ImportStudentsModal
          klassId={klass.id}
          onClose={() => setImportOpen(false)}
        />
      )}

      {showGroupModal && (
        <GroupModal
          klassId={klass.id}
          memberCount={members.length}
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </>
  );
}

function GroupDragBoard({
  klassId,
  groups,
  groupMembers,
  memberById,
  ungrouped,
  onDelete,
}: {
  klassId: string;
  groups: any[];
  groupMembers: any[];
  memberById: Record<string, any>;
  ungrouped: any[];
  onDelete: (groupId: string) => void;
}) {
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overTarget, setOverTarget] = useState<string | null>(null);

  function handleDragStart(userId: string) {
    setDragId(userId);
  }
  function handleDragEnd() {
    setDragId(null);
    setOverTarget(null);
  }
  function handleDrop(targetGroupId: string | null) {
    if (!dragId) return;
    const userId = dragId;
    setDragId(null);
    setOverTarget(null);
    start(async () => {
      await moveStudentToGroup(klassId, userId, targetGroupId);
    });
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const gms = groupMembers.filter((gm) => gm.groupId === g.id);
        const isOver = overTarget === g.id;
        return (
          <div
            key={g.id}
            onDragOver={(e) => { e.preventDefault(); setOverTarget(g.id); }}
            onDragLeave={() => setOverTarget(null)}
            onDrop={(e) => { e.preventDefault(); handleDrop(g.id); }}
            className={`p-3 rounded-lg border-l-4 transition ${
              isOver
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400"
                : "bg-slate-50 dark:bg-slate-800/50"
            }`}
            style={!isOver ? { borderLeftColor: g.color } : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">{g.name} <span className="text-xs text-slate-500 font-normal">({gms.length})</span></div>
              <button
                onClick={() => onDelete(g.id)}
                className="text-slate-400 hover:text-rose-500"
                title="Gruppe löschen"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {gms.map((gm) => {
                const u = memberById[gm.userId];
                if (!u) return null;
                return (
                  <button
                    key={gm.userId}
                    draggable
                    onDragStart={() => handleDragStart(u.id)}
                    onDragEnd={handleDragEnd}
                    className={`inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing transition ${
                      dragId === u.id ? "opacity-30" : ""
                    } bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`}
                  >
                    <Avatar user={u} size={20} />
                    {u.displayName}
                  </button>
                );
              })}
              {gms.length === 0 && <span className="text-xs text-slate-400 italic">Drop SuS hierher</span>}
            </div>
          </div>
        );
      })}
      {ungrouped.length > 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setOverTarget("none"); }}
          onDragLeave={() => setOverTarget(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(null); }}
          className={`p-3 rounded-lg border border-dashed transition ${
            overTarget === "none"
              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
              : "border-slate-300 dark:border-slate-700"
          }`}
        >
          <div className="text-xs text-slate-500 mb-1">Noch ohne Gruppe ({ungrouped.length})</div>
          <div className="flex flex-wrap gap-1">
            {ungrouped.map((u) => (
              <button
                key={u.id}
                draggable
                onDragStart={() => handleDragStart(u.id)}
                onDragEnd={handleDragEnd}
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium cursor-grab active:cursor-grabbing transition ${
                  dragId === u.id ? "opacity-30" : ""
                } bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200`}
              >
                {u.displayName}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setOverTarget("none"); }}
          onDragLeave={() => setOverTarget(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(null); }}
          className={`p-2 rounded-lg border border-dashed text-xs text-center transition ${
            overTarget === "none"
              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700"
              : "border-slate-300 dark:border-slate-700 text-slate-400"
          }`}
        >
          Hierher ziehen, um SuS aus Gruppe zu entfernen
        </div>
      )}
      <p className="text-xs text-slate-500 mt-3">
        💡 Tipp: Ziehe SuS per Drag & Drop zwischen den Gruppen, um manuell umzuordnen.
      </p>
    </div>
  );
}

function GroupModal({
  klassId,
  memberCount,
  onClose,
}: {
  klassId: string;
  memberCount: number;
  onClose: () => void;
}) {
  const [size, setSize] = useState(4);
  const [pending, start] = useTransition();
  const groupCount = Math.ceil(memberCount / size);

  function handleCreate() {
    start(async () => {
      await createGroupsForClass(klassId, { groupSize: size, mode: "random", reset: true });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Gruppen bilden</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Gruppengröße: {size}</Label>
            <input
              type="range"
              min={2}
              max={Math.min(8, memberCount)}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>2</span>
              <span>{Math.min(8, memberCount)}</span>
            </div>
          </div>

          <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sm">
            <strong>{groupCount}</strong> Gruppen aus <strong>{memberCount}</strong> Schüler:innen.
            <br />
            <span className="text-xs text-slate-500">
              Verteilung: {Array.from({ length: groupCount }, (_, i) => {
                const remaining = memberCount - i * size;
                return Math.min(size, remaining);
              }).join("-")}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Bestehende Gruppen werden überschrieben. Zufalls-Verteilung —
            manuelle Anpassung danach pro Schüler möglich.
          </p>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Abbrechen</Button>
            <Button onClick={handleCreate} disabled={pending} className="flex-1">
              <Shuffle className="w-4 h-4" /> Zufällig bilden
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ImportStudentsModal({
  klassId,
  onClose,
}: {
  klassId: string;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  // Parsing: jede Zeile = ein Name; Komma/Semikolon werden als Trenner akzeptiert
  const names = text
    .split(/[\r\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(names));

  function submit() {
    if (unique.length === 0) return;
    start(async () => {
      try {
        const r = await bulkAddStudents(klassId, unique);
        alert(`${r.added} hinzugefügt${r.skipped ? `, ${r.skipped} schon vorhanden` : ""}.`);
        onClose();
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Klassenliste importieren</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Ein Name pro Zeile (oder mit Komma/Semikolon getrennt).
          Schüler:innen, die schon in der Klasse sind, werden übersprungen.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"Lisa M.\nMax K.\nAnna B.\n..."}
          className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm font-mono"
          autoFocus
        />
        <p className="text-xs text-slate-500 mt-2 mb-3">
          Erkannt: <strong>{unique.length}</strong> Name{unique.length === 1 ? "" : "n"}
          {names.length > unique.length && <> ({names.length - unique.length} Duplikate ignoriert)</>}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Abbrechen</Button>
          <Button onClick={submit} disabled={pending || unique.length === 0} className="flex-1">
            <Upload className="w-4 h-4" /> {unique.length} hinzufügen
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CoTeacherCard({
  klassId,
  isOwner,
  owner,
  coTeachers,
  availableTeachers,
}: {
  klassId: string;
  isOwner: boolean;
  owner: any;
  coTeachers: any[];
  availableTeachers: any[];
}) {
  const [, start] = useTransition();
  const [selected, setSelected] = useState("");

  return (
    <Card>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" /> Lehrkräfte ({1 + coTeachers.length})
      </h2>
      <ul className="space-y-2 mb-3">
        <li className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20">
          {owner && <Avatar user={owner} size={28} />}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{owner?.displayName ?? "—"}</div>
            <div className="text-xs text-sky-600 dark:text-sky-400">Haupt-Lehrkraft</div>
          </div>
        </li>
        {coTeachers.map((t) => (
          <li key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 group">
            <Avatar user={t} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.displayName}</div>
              <div className="text-xs text-slate-500">Co-Lehrer:in</div>
            </div>
            {isOwner && (
              <>
                <button
                  onClick={() => {
                    if (confirm(`Klasse an ${t.displayName} übergeben?\n\nDu wirst Co-Lehrer:in dieser Klasse.`)) {
                      start(async () => {
                        try {
                          await transferClassOwnership({ classId: klassId, newOwnerId: t.id });
                        } catch (e: any) { alert(e.message); }
                      });
                    }
                  }}
                  className="text-slate-400 hover:text-sky-600 opacity-0 group-hover:opacity-100"
                  title="Klasse übergeben"
                >
                  ↑
                </button>
                <button
                  onClick={() => {
                    if (confirm(`${t.displayName} aus der Klasse entfernen?`)) {
                      start(() => { removeCoTeacher(klassId, t.id); });
                    }
                  }}
                  className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {isOwner && availableTeachers.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
          >
            <option value="">— Kollegin/Kollege wählen —</option>
            {availableTeachers.map((u) => (
              <option key={u.id} value={u.id}>{u.displayName}</option>
            ))}
          </select>
          <Button
            onClick={() => {
              if (!selected) return;
              start(() => { addCoTeacher(klassId, selected); });
              setSelected("");
            }}
            disabled={!selected}
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      {!isOwner && (
        <p className="text-xs text-slate-500">Nur die Haupt-Lehrkraft kann Co-Lehrkräfte verwalten.</p>
      )}
    </Card>
  );
}

function TopicsCard({
  klassId,
  topics,
  taskCountByTopic,
  unassignedTaskCount,
}: {
  klassId: string;
  topics: any[];
  taskCountByTopic: Record<string, number>;
  unassignedTaskCount: number;
}) {
  const [, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  function saveEdit(id: string) {
    if (!editTitle.trim()) {
      setEditing(null);
      return;
    }
    start(async () => {
      await updateTopic({ id, title: editTitle });
      setEditing(null);
    });
  }

  return (
    <Card>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <BookMarked className="w-4 h-4" /> Themen ({topics.length})
      </h2>

      <form
        className="flex gap-2 mb-4"
        action={async (fd) => {
          fd.append("classId", klassId);
          await createTopic(fd);
        }}
      >
        <Input name="title" placeholder="Neues Thema…" required />
        <Button type="submit" title="Thema anlegen">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {topics.length === 0 ? (
        <p className="text-sm text-slate-500">
          Keine Themen — strukturiere deine Aufgaben (z. B. „Anatomie", „Hygiene", „Pflegeprozess").
        </p>
      ) : (
        <ul className="space-y-1.5">
          {topics.map((t, i) => {
            const isEditing = editing === t.id;
            const cnt = taskCountByTopic[t.id] ?? 0;
            return (
              <li
                key={t.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 group"
              >
                <div className="flex flex-col gap-0">
                  <button
                    onClick={() => start(() => { moveTopic(t.id, "up"); })}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-sky-500 disabled:opacity-30 leading-none"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => start(() => { moveTopic(t.id, "down"); })}
                    disabled={i === topics.length - 1}
                    className="text-slate-400 hover:text-sky-500 disabled:opacity-30 leading-none"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveEdit(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(t.id);
                        else if (e.key === "Escape") setEditing(null);
                      }}
                      className="w-full bg-transparent border-b border-sky-400 outline-none text-sm"
                    />
                  ) : (
                    <div className="font-medium text-sm truncate">{t.title}</div>
                  )}
                  <div className="text-xs text-slate-500">{cnt} Aufgaben</div>
                </div>

                <button
                  onClick={() => {
                    setEditing(t.id);
                    setEditTitle(t.title);
                  }}
                  className="text-slate-400 hover:text-sky-500 opacity-0 group-hover:opacity-100"
                  title="Umbenennen"
                >
                  {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Thema "${t.title}" löschen? Aufgaben bleiben erhalten, werden aber aus dem Thema gelöst.`)) {
                      start(() => { deleteTopic(t.id); });
                    }
                  }}
                  className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                  title="Löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            );
          })}
          {unassignedTaskCount > 0 && (
            <li className="px-2 py-1 mt-2 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2">
              {unassignedTaskCount} Aufgabe{unassignedTaskCount === 1 ? "" : "n"} ohne Thema
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
