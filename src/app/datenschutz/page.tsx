import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Input";
import { Shield, Database, Lock, Trash2, Download, Eye, Server } from "lucide-react";
import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Datenschutz</h1>
            <p className="text-sm text-slate-500">Wie deine Daten in der Test Schule geschützt sind</p>
          </div>
        </div>

        <Card className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Welche Daten werden gespeichert?
          </h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>Profil:</strong> Anzeigename, Avatar (Emoji/Farbe), bei Lehrkräften zusätzlich E-Mail.</li>
            <li><strong>Lernfortschritt:</strong> Antworten auf Aufgaben, Score, XP, Streak, letzter Aktivitätszeitpunkt.</li>
            <li><strong>Kommunikation:</strong> Forum-Beiträge, Direktnachrichten, Benachrichtigungen.</li>
            <li><strong>Klassenzuordnung:</strong> in welchen Klassen du Mitglied bist; bei Lehrkräften welche Klassen du leitest.</li>
          </ul>
        </Card>

        <Card className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" /> Wo werden die Daten gespeichert?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Aktuell läuft die App lokal auf dem Mac der Lehrkraft.
            Alle Daten liegen in einer SQLite-Datei auf diesem Rechner —
            sie verlassen das lokale Netz nur, wenn du mit deinem Endgerät über
            Tailscale verbunden bist (verschlüsseltes Mesh-VPN).
            Beim Wechsel in den Schulbetrieb werden die Daten auf einen Server
            in der EU verlagert; darüber wird vorher gesondert informiert.
          </p>
        </Card>

        <Card className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Wie werden sie geschützt?
          </h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>Lehrkraft-Passwörter</strong> werden nur als bcrypt-Hash gespeichert.</li>
            <li><strong>Sessions</strong> laufen über signierte JWT-Cookies mit eigenem Geheimnis.</li>
            <li><strong>Tägliches Backup</strong> der Datenbank in <code>data/backups/</code>, 30 Tage Aufbewahrung.</li>
            <li><strong>Audit-Log</strong> protokolliert wer wann welche relevanten Aktionen ausgeführt hat.</li>
            <li><strong>Schüler:innen</strong> melden sich mit Klassen-Code + frei wählbarem Namen an — keine E-Mail-Pflicht.</li>
          </ul>
        </Card>

        <Card className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Wer sieht meine Daten?
          </h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>Du selbst</strong> in deinem Profil.</li>
            <li><strong>Deine Lehrkraft</strong> der jeweiligen Klasse: Anzeigename, Avatar, deine Abgaben + Scores.</li>
            <li><strong>Mitschüler:innen</strong>: Anzeigename + Avatar + Punktestand in Klassen-/Live-Quiz-Bestenlisten. Forum-Beiträge sind klassen-öffentlich.</li>
            <li><strong>Direktnachrichten</strong> sind privat zwischen Sender und Empfänger.</li>
          </ul>
        </Card>

        <Card className="mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" /> Deine Rechte
          </h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>Auskunft (Art. 15) + Datenübertragbarkeit (Art. 20):</strong>{" "}
              <Link href="/api/profil/export" className="text-sky-600 hover:underline">
                Daten als JSON herunterladen
              </Link>
            </li>
            <li><strong>Berichtigung (Art. 16):</strong> Profil-Seite — Name + Avatar selbst anpassen.</li>
            <li><strong>Löschung (Art. 17):</strong> Profil-Seite ganz unten — Konto endgültig löschen.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Aufbewahrung
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Daten werden so lange gespeichert, wie das Konto besteht. Nach Konto-Löschung verschwinden
            personenbezogene Daten unwiderruflich. Backups werden zusätzlich 30 Tage aufbewahrt
            und danach automatisch überschrieben.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
