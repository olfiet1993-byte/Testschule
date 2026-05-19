"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { runBackup } from "@/lib/actions/backup";
import { Database, Download, Loader2 } from "lucide-react";

export function BackupClient({ backups }: { backups: Array<{ name: string; sizeKB: number; date: string }> }) {
  const [pending, start] = useTransition();
  const [lastRun, setLastRun] = useState<{ filename: string; sizeKB: number } | null>(null);

  function go() {
    start(async () => {
      try {
        const r = await runBackup();
        setLastRun(r);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  return (
    <Card>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Database className="w-4 h-4" /> Backups
      </h2>
      <p className="text-sm text-slate-500 mb-3">
        Sicherung der SQLite-Datenbank. Behält die letzten 30 Backups.
      </p>
      <Button onClick={go} disabled={pending} className="w-full mb-3">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Jetzt sichern
      </Button>

      {lastRun && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded mb-3">
          ✓ {lastRun.filename} ({lastRun.sizeKB} KB) erstellt
        </div>
      )}

      <div className="text-xs text-slate-500">
        <strong>{backups.length}</strong> Backups vorhanden{" "}
        {backups[0] && <>· letztes: {new Date(backups[0].date).toLocaleString("de-DE")}</>}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">
        Pfad: <code>data/backups/</code>
      </p>
    </Card>
  );
}
