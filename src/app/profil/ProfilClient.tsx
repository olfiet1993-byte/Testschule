"use client";

import { useState, useTransition } from "react";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";
import { setAvatar, setDisplayName, deleteOwnAccount, changePin } from "@/lib/actions/profile";
import { levelTitle } from "@/lib/utils";
import { Sparkles, Check, Flame, Download, Trash2, Shield, KeyRound } from "lucide-react";
import { ActivityHeatmap, type Activity } from "@/components/ActivityHeatmap";
import Link from "next/link";

const EMOJI_CHOICES = [
  "🧑‍⚕️", "👩‍⚕️", "👨‍⚕️", "👨‍🏫", "👩‍🏫", "🧑‍🎓", "👨‍🎓", "👩‍🎓",
  "🦸", "🧙", "🥷", "🧚", "🦊", "🐱", "🐼", "🐧",
  "🌟", "⭐", "🎯", "🏆", "🩺", "💊",
];

const COLOR_CHOICES = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
];

export function ProfilClient({
  user,
  classes,
  stats,
  activities,
}: {
  user: any;
  classes: any[];
  stats: { submissions: number; meanScore: number | null; totalXpEarned: number };
  activities: Activity[];
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(user.displayName);
  const [emoji, setEmojiLocal] = useState<string | null>(user.avatarEmoji);
  const [color, setColorLocal] = useState<string | null>(user.avatarColor);

  function applyEmoji(e: string | null) {
    setEmojiLocal(e);
    start(async () => { await setAvatar({ emoji: e }); });
  }
  function applyColor(c: string | null) {
    setColorLocal(c);
    start(async () => { await setAvatar({ color: c }); });
  }

  const previewUser = { ...user, avatarEmoji: emoji, avatarColor: color };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Mein Profil</h1>
      <p className="text-sm text-slate-500 mb-6">
        Passe deinen Avatar an — Emoji wählen oder eigene Farbe für deine Initialen.
      </p>

      <Card className="mb-6">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <Avatar user={previewUser} size={72} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{user.displayName}</h2>
            <p className="text-sm text-slate-500">
              {levelTitle(user.level)} · Level {user.level} · {user.xp} XP
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {user.role === "teacher" ? "Lehrkraft" : "Schüler:in"}
              {classes.length > 0 && <> · {classes.map((c) => c.name).join(", ")}</>}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> Emoji-Avatar
        </h3>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          <button
            type="button"
            onClick={() => applyEmoji(null)}
            className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs ${
              emoji === null
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
            }`}
            title="Initialen statt Emoji"
          >
            {emoji === null && <Check className="w-4 h-4" />}
            {emoji !== null && "Aa"}
          </button>
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => applyEmoji(e)}
              className={`aspect-square rounded-lg border-2 flex items-center justify-center text-2xl transition ${
                emoji === e
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 scale-110"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:scale-105"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Card>

      {emoji === null && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Farbe deiner Initialen</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyColor(null)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xs border-2 transition ${
                color === null ? "border-slate-700 dark:border-slate-300" : "border-transparent hover:border-slate-300"
              }`}
              style={{ background: "transparent" }}
              title="Automatisch"
            >
              auto
            </button>
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyColor(c)}
                className={`w-12 h-12 rounded-full transition border-2 ${
                  color === c ? "border-slate-700 dark:border-slate-300 scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </Card>
      )}

      {user.role === "student" && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> PIN ändern
          </h3>
          <form
            className="grid grid-cols-1 md:grid-cols-3 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const oldPin = String(fd.get("oldPin") ?? "");
              const newPin = String(fd.get("newPin") ?? "");
              const confirmPin = String(fd.get("confirmPin") ?? "");
              if (newPin !== confirmPin) return alert("PINs stimmen nicht überein");
              start(async () => {
                try {
                  await changePin({ oldPin, newPin });
                  (e.target as HTMLFormElement).reset();
                  alert("PIN geändert.");
                } catch (err: any) { alert(err.message); }
              });
            }}
          >
            <Input name="oldPin" type="password" placeholder="Aktuelle PIN" required minLength={4} className="font-mono" />
            <Input name="newPin" type="password" placeholder="Neue PIN" required minLength={4} className="font-mono" />
            <Input name="confirmPin" type="password" placeholder="Neue PIN wiederh." required minLength={4} className="font-mono" />
            <Button type="submit" disabled={pending} className="md:col-span-3">PIN ändern</Button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            Solltest du deine PIN vergessen, kann deine Lehrkraft sie zurücksetzen.
          </p>
        </Card>
      )}

      {user.role === "student" && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-3">Anzeigename</h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name === user.displayName) return;
              start(async () => {
                try {
                  await setDisplayName(name);
                } catch (err: any) {
                  alert(err.message);
                }
              });
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={pending || name === user.displayName}>
              Speichern
            </Button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            So sehen dich deine Lehrkraft und Mitschüler:innen in Listen und im Live-Quiz.
          </p>
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="font-semibold mb-3">Lernfortschritt</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{user.xp}</div>
            <div className="text-xs text-slate-500">XP</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.submissions}</div>
            <div className="text-xs text-slate-500">Abgaben</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.meanScore != null ? `${stats.meanScore.toFixed(0)}%` : "–"}</div>
            <div className="text-xs text-slate-500">Ø Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold inline-flex items-center gap-1">
              <Flame className={`w-5 h-5 ${user.streakDays > 0 ? "text-orange-500" : "text-slate-300"}`} />
              {user.streakDays}
            </div>
            <div className="text-xs text-slate-500">Streak</div>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold mb-3">Aktivität</h3>
        <ActivityHeatmap activities={activities} />
      </Card>

      <Card>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Datenschutz & Konto
        </h3>
        <div className="space-y-3">
          <div>
            <a href="/api/profil/export" download>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4" /> Meine Daten herunterladen
              </Button>
            </a>
            <p className="text-xs text-slate-500 mt-1">
              JSON-Datei mit allen zu dir gespeicherten Daten (Art. 20 DSGVO).
            </p>
          </div>

          <div>
            <Link href="/datenschutz" className="text-sm text-sky-600 hover:underline">
              Datenschutz-Informationen ansehen →
            </Link>
          </div>

          <details className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <summary className="text-sm font-medium text-rose-600 cursor-pointer">
              Konto endgültig löschen
            </summary>
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-3">
                Löscht dein Konto und alle damit verbundenen Daten (Abgaben, Nachrichten, Forum-Beiträge, Notifications). Diese Aktion ist <strong>nicht rückgängig</strong> machbar.
                {user.role === "teacher" && <> Vorher müssen alle deine Klassen entweder gelöscht oder einer anderen Lehrkraft übergeben werden.</>}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const conf = String(fd.get("confirmation") ?? "");
                  if (conf !== "LÖSCHEN") return alert("Bestätigung muss 'LÖSCHEN' lauten.");
                  if (!confirm("Konto wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
                  start(async () => {
                    try { await deleteOwnAccount(conf); } catch (err: any) { alert(err.message); }
                  });
                }}
                className="flex gap-2"
              >
                <Input name="confirmation" placeholder="LÖSCHEN" className="font-mono" />
                <Button type="submit" variant="danger" disabled={pending}>
                  <Trash2 className="w-4 h-4" /> Konto löschen
                </Button>
              </form>
            </div>
          </details>
        </div>
      </Card>
    </div>
  );
}
