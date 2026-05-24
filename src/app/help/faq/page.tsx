import Link from "next/link";
import {
  ArrowLeft, HelpCircle, GraduationCap, ClipboardList, Layers, Map,
  Shield, MonitorSmartphone, TrendingUp, Send, QrCode, Activity,
} from "lucide-react";
import { FaqAccordion, type FaqCategory } from "./FaqAccordion";

export const metadata = {
  title: "FAQ · Test Schule",
  description: "Antworten auf häufige Fragen",
};

const CATEGORIES: FaqCategory[] = [
  {
    id: "konto",
    title: "Anmeldung & Konten",
    icon: "GraduationCap",
    color: "from-sky-500 to-cyan-500",
    items: [
      {
        q: "Wie melde ich mich als Lehrkraft an?",
        a: "Auf der Login-Seite den Tab 'Lehrkraft' wählen, E-Mail und Passwort eingeben. Für die Demo: lehrer@demo.test / demo1234.",
        tags: ["login", "lehrer"],
      },
      {
        q: "Wie kommen Schüler:innen in die App?",
        a: "Du hast zwei Wege:\n\n1. QR-Code aus der Klassen-Detail-Seite zeigen — Schüler:innen scannen mit der Handy-Kamera und landen automatisch auf der Anmelde-Seite mit ausgefülltem Code.\n\n2. Klassen-Code (6 Buchstaben, z. B. DEMO01) verbal weitergeben — Schüler:innen geben ihn im Schüler-Tab auf /login ein, dann ihren Vornamen + selbstgewählte PIN (mind. 4 Ziffern).",
        tags: ["qr", "schüler", "code"],
      },
      {
        q: "Eine Schüler:in hat ihre PIN vergessen — was tun?",
        a: "Als Lehrkraft: gehe in die Klassen-Detail-Seite, klicke auf die Schüler:in, dann auf 'PIN zurücksetzen'. Die Schüler:in legt beim nächsten Login eine neue PIN fest. Aus Sicherheitsgründen kann nur die zugehörige Lehrkraft eine PIN zurücksetzen.",
        tags: ["pin", "passwort", "vergessen"],
      },
      {
        q: "Kann ich eine Klasse mit Kolleg:innen teilen (Co-Teacher)?",
        a: "Ja. In der Klassen-Detail-Seite gibt es einen Abschnitt 'Co-Lehrkräfte'. Lade weitere Lehrer:innen per E-Mail ein — sie können dieselben Aufgaben sehen + bearbeiten + Statistiken einsehen. Die Eigentümerin (du) bleibt aber Hauptverantwortliche.",
        tags: ["co-teacher", "kollege"],
      },
      {
        q: "Kann ich eine Klasse löschen?",
        a: "Ja, oben rechts in der Klassen-Detail-Seite gibt es einen 'Löschen'-Button. ACHTUNG: Damit sind alle Aufgaben, Abgaben und Statistiken dieser Klasse weg. Vorher die Daten exportieren (CSV oder Excel).",
        tags: ["löschen", "klasse"],
      },
    ],
  },
  {
    id: "aufgaben",
    title: "Aufgaben & Inhalte",
    icon: "ClipboardList",
    color: "from-violet-500 to-fuchsia-500",
    items: [
      {
        q: "Eine Aufgabe wird Schüler:innen nicht angezeigt — woran kann das liegen?",
        a: "Drei häufige Gründe:\n\n1. Die Aufgabe ist noch ein Entwurf — sie muss 'veröffentlicht' werden (Auge-Symbol in der Aufgabenliste oder grüner 'Senden'-Knopf im Klassenzimmer-Panel).\n\n2. Die Schüler:in ist nicht in der richtigen Klasse — prüfe die Klassenzugehörigkeit.\n\n3. Bei Klausuren: Schüler:innen sehen erst die Frage wenn sie die Klausur aktiv starten.",
        tags: ["unsichtbar", "veröffentlichen"],
      },
      {
        q: "Wie aktiviere ich den Klausur-Modus?",
        a: "Im Aufgaben-Editor (Quiz/Cloze/Case): Abschnitt 'Klausur-Modus' aktivieren. Du kannst optional ein Zeitlimit in Minuten setzen. Bei Klausuren:\n- Schüler:innen haben nur EINEN Versuch\n- Die Auflösung (richtige Antworten) bleibt verborgen, bis du sie aktiv freigibst\n- Vor dem Start zeigt eine Gate-Seite die Klausur-Regeln",
        tags: ["klausur", "prüfung", "exam"],
      },
      {
        q: "Wie funktioniert der KI-Generator?",
        a: "Auf jedem Aufgaben-Editor (Quiz/Cloze/Flashcards/Case) gibt es einen 'Mit KI generieren'-Knopf. Du beschreibst kurz das Thema, wählst Schwierigkeit + Anzahl, Claude erstellt einen Entwurf, den du dann polierst und veröffentlichst.\n\nVoraussetzung: ANTHROPIC_API_KEY muss in der .env.local gesetzt sein. Ohne kommt eine klare Fehlermeldung.",
        tags: ["ki", "ai", "claude", "generator"],
      },
      {
        q: "Kann ich aus einem Lerntext automatisch Aufgaben machen?",
        a: "Ja! In der Bibliothek auf jedem Text-Item gibt es zwei KI-Knöpfe:\n\n• '✨ Aufgabe ableiten' — wählt Aufgabentyp (Quiz/Cloze/Flashcards/Case), KI liest den Text und erzeugt eine Entwurfs-Aufgabe in der gewählten Klasse.\n\n• '📖 Glossar extrahieren' — KI findet Fachbegriffe + Definitionen im Text und speichert sie als Begriffs-Items in der Bibliothek.",
        tags: ["bibliothek", "ki", "ableiten", "glossar"],
      },
      {
        q: "Wie lade ich Bilder in die Bibliothek?",
        a: "Bibliothek → 'Neuer Inhalt' → Typ 'Bild' wählen → JPG/PNG hochladen (max. ~5 MB). Das Bild wird auf den Server gespeichert (data/uploads/) und kann in Image-Hotspot-Aufgaben verwendet werden.",
        tags: ["bild", "upload"],
      },
      {
        q: "Was bedeuten die Schwierigkeits-Badges?",
        a: "🟢 leicht · 🟡 mittel · 🔴 schwer. Hilft Schüler:innen zur Selbsteinschätzung und dem Lernpfad-Auto-Generator, Aufgaben sinnvoll zu verteilen (leichte zuerst).",
        tags: ["schwierigkeit", "difficulty"],
      },
    ],
  },
  {
    id: "karteikarten",
    title: "Karteikarten & Lernpfade",
    icon: "Layers",
    color: "from-amber-500 to-orange-500",
    items: [
      {
        q: "Wie entstehen Karteikarten?",
        a: "Automatisch! Beim Schreiben jeder Aufgabe (Quiz, Cloze, Case, Flashcards) erscheint unten rechts ein Vorschlags-Panel mit passenden Karteikarten. Du kannst Vorschläge einzeln abwählen, alle akzeptieren oder das Panel ignorieren.\n\nAlternativ: in 'Klassen → Karteikarten' kannst du Stapel manuell anlegen und Karten hinzufügen.",
        tags: ["karten", "spaced", "repetition"],
      },
      {
        q: "Was ist Spaced Repetition / der SM-2-Algorithmus?",
        a: "Karteikarten erscheinen nicht alle gleichzeitig — sondern dann wenn die Schüler:in sie gerade vergessen würde. Nach jeder Karte bewertet die Schüler:in selbst:\n• Nochmal → in 1 Tag wieder\n• Schwer → in ~3 Tagen\n• Gut → in ~7 Tagen\n• Einfach → in 14+ Tagen\n\nKarten die oft falsch sind, kommen häufiger. Karten die immer richtig sind, kommen kaum noch — das ist der Lerneffekt.",
        tags: ["sm2", "wiederholung"],
      },
      {
        q: "Wie funktionieren Lernpfade?",
        a: "Lernpfade sind strukturierte Mehrwochen-Lernreisen. Du legst einen Pfad an (Name, Startdatum, Anzahl Wochen) und ordnest Aufgaben Wochen zu — manuell per Drag&Drop oder über den 'Auto-Generator', der vorhandene Aufgaben nach Schwierigkeit (leicht zuerst) verteilt.\n\nSchüler:innen sehen in 'Mein Wochenplan' immer die Aufgaben der laufenden Woche mit Fortschritts-Balken.",
        tags: ["lernpfad", "wochenplan"],
      },
      {
        q: "Wie drucke ich Karteikarten zum Ausschneiden?",
        a: "Klassen → Karteikarten → 'Druckansicht'. Es öffnet sich ein A4-Hochformat-Layout mit 4 Karten pro Bogen (2×2). Drucke zuerst die Vorderseiten-Bögen (Seiten 1, 3, 5, …), dann Papier wenden und Rückseiten drucken (Seiten 2, 4, 6, …). Schnittlinien sind gestrichelt eingezeichnet.",
        tags: ["drucken", "ausschneiden"],
      },
    ],
  },
  {
    id: "klassenzimmer",
    title: "Klassenzimmer-Panel",
    icon: "Send",
    color: "from-emerald-500 to-teal-500",
    items: [
      {
        q: "Was ist das Klassenzimmer-Panel?",
        a: "Eine persistente rechte Sidebar (sichtbar ab 1280px Bildschirmbreite). Zeigt dir die laufende Woche Mo-Fr als Tabs, mit:\n• Stundenplan-Slots pro Tag\n• Fällige Aufgaben pro Tag\n• Backlog (noch nicht eingeplante Aufgaben) unten\n\nDu planst hier deinen Tag und kannst Aufgaben mit einem Klick freischalten.",
        tags: ["panel", "sidebar"],
      },
      {
        q: "Ich sehe das Klassenzimmer-Panel nicht — warum?",
        a: "Drei mögliche Gründe:\n\n1. Bildschirm zu schmal — das Panel zeigt sich erst ab 1280px Breite (xl-Breakpoint in Tailwind).\n\n2. Eingeklappt — oben rechts gibt es einen Panel-Toggle-Knopf, der den Zustand im localStorage merkt.\n\n3. Du bist als Schüler:in angemeldet — das Panel ist nur für Lehrkräfte.",
        tags: ["panel", "versteckt", "hidden"],
      },
      {
        q: "Wie bringe ich eine Aufgabe in einen bestimmten Tag?",
        a: "Zwei Wege:\n\n1. Drag & Drop — Aufgabe aus dem Backlog packen, auf den gewünschten Mo-Fr-Tab oben ziehen, loslassen. Fälligkeit ist gesetzt.\n\n2. Klick-Picker — falls Drag nicht klappt (Touch-Gerät), kleines Kalender-Symbol auf der Aufgabe klicken, Tag wählen.",
        tags: ["drag", "drop", "fällig", "due"],
      },
      {
        q: "Was macht der 'X senden'-Knopf?",
        a: "Im Tages-Header neben 'Fällige Aufgaben' erscheint dieser Knopf, wenn an dem Tag ungesendete Aufgaben anstehen. Ein Klick:\n• veröffentlicht alle Aufgaben des Tages auf einmal\n• schickt jede:r Schüler:in eine Push-Notification\n• schreibt Audit-Log-Einträge\n\nDanach steht 'alle gesendet' und der Knopf verschwindet.",
        tags: ["senden", "publish"],
      },
      {
        q: "Wozu der Bell-Knopf neben dem 0/2-Counter?",
        a: "Erinnerung an Nicht-Abgeber. Bei einer veröffentlichten Aufgabe mit noch nicht allen Abgaben kannst du auf das Bell-Symbol klicken — alle Schüler:innen die noch nicht abgegeben haben, bekommen eine Notification.\n\nThrottle: Bitte nicht mehrfach hintereinander drücken — die Schüler:innen sehen die Notification.",
        tags: ["erinnern", "bell", "remind"],
      },
    ],
  },
  {
    id: "statistik",
    title: "Statistik & Export",
    icon: "TrendingUp",
    color: "from-rose-500 to-pink-500",
    items: [
      {
        q: "Was bedeuten die Farben in der Heatmap?",
        a: "🟢 ≥ 90 % — sicher beherrscht\n🟢 70-89 % — gut\n🟡 50-69 % — Übungsbedarf\n🟥 < 50 % — Wiederholungsbedarf\n⬜ leer — noch keine Abgabe\n\nGleiche Skala in 'Schüler×Aufgabe' und 'Schüler×Thema' (Themen-Mastery).",
        tags: ["heatmap", "farben"],
      },
      {
        q: "Wie exportiere ich die Notenliste nach Excel?",
        a: "Klassen → Statistik → Knopf 'Excel'. Du bekommst eine .xlsx mit 3 Sheets:\n\n1. Notenliste — Schüler×Aufgabe-Matrix mit Farbcodierung, Ø % und Note 1-6\n2. Themen-Mastery — Schüler×Thema mit Heatmap-Farben\n3. Aufgaben-Statistik — pro Aufgabe Ø/Min/Max %\n\nIm Excel sind Freeze-Panes gesetzt (erste Zeile + erste Spalte bleiben beim Scrollen).",
        tags: ["excel", "export", "noten"],
      },
      {
        q: "Wie drucke ich die Notenliste auf A4?",
        a: "Klassen → Statistik → 'Druckansicht'. Öffnet eine eigene Seite im A4-Querformat mit der vollständigen Schüler×Aufgabe-Matrix + Ø-Spalte + Notenschlüssel. 'Drucken / als PDF speichern'-Knopf oben rechts.",
        tags: ["drucken", "notenliste"],
      },
      {
        q: "Kann ich Aufgaben als Word-Datei exportieren?",
        a: "Ja. In der Aufgaben-Liste neben jeder Aufgabe ist ein 📥-Symbol. Klick öffnet ein Modal mit Formaten:\n• Word (.docx) — bearbeitbares Arbeitsblatt, optional mit/ohne Lösungen\n• PowerPoint (.pptx) — nur bei Fallstudien, 1 Folie pro Schritt\n• PDF / Druck — Browser-Druckansicht",
        tags: ["word", "pptx", "office"],
      },
    ],
  },
  {
    id: "vitalsim",
    title: "Vitalwerte-Simulator",
    icon: "Activity",
    color: "from-rose-500 to-amber-500",
    items: [
      {
        q: "Wofür ist der Vitalwerte-Simulator?",
        a: "Trainings-Tool für die Pflegeausbildung. Schüler:innen sehen einen Patient mit Kontext und 7 Vitalwerten (Puls, Blutdruck systolisch/diastolisch, Atemfrequenz, SpO2, Temperatur, Bewusstsein) und:\n\n1. Schritt 1: auffällige Werte markieren\n2. Schritt 2: korrekte pflegerische Maßnahmen wählen\n\nDanach Auflösung mit Score, Diagnose, Streak-Counter.",
        tags: ["vital", "pflege", "simulator"],
      },
      {
        q: "Kann ich eigene Vital-Szenarien anlegen?",
        a: "Ja, als Lehrkraft. Klassen → 'Vital-Fälle'. Du erstellst Patienten mit Name, Alter, Kontext, allen 7 Vitalwerten, markierst auffällige Werte und gibst korrekte + falsche Maßnahmen ein. Mit dem KI-Knopf 'Mit KI generieren' beschreibst du einfach ein Krankheitsbild, Claude füllt das Formular aus.",
        tags: ["vital", "szenario", "fall"],
      },
    ],
  },
  {
    id: "datenschutz",
    title: "Datenschutz & Sicherheit",
    icon: "Shield",
    color: "from-slate-600 to-slate-800",
    items: [
      {
        q: "Welche Daten werden gespeichert?",
        a: "Pro Schüler:in: Vorname (frei wählbar — kann ein Spitzname sein), gehashte PIN, Klassenmitgliedschaft, alle Abgaben + Scores + Zeitstempel, XP/Level/Streak, optional ein Emoji-Avatar.\n\nPro Lehrkraft: E-Mail, gehashtes Passwort, Anzeigename.\n\nWir speichern KEINE: echte Namen (außer freiwillig angegeben), Schulzeugnisse, externe IDs, Geburtstage, Adressen.",
        tags: ["datenschutz", "dsgvo"],
      },
      {
        q: "Können Schüler:innen ihre Daten exportieren?",
        a: "Ja, DSGVO Art. 20 (Recht auf Datenübertragbarkeit). In 'Mein Profil' → 'Daten exportieren' bekommt jede:r eine JSON-Datei mit allen eigenen Daten.",
        tags: ["export", "dsgvo", "art20"],
      },
      {
        q: "Können Schüler:innen ihr Konto löschen?",
        a: "Ja, DSGVO Art. 17 (Recht auf Vergessenwerden). In 'Mein Profil' → 'Konto löschen'. Alle persönlichen Daten und Abgaben werden gelöscht. Aggregierte Klassenstatistiken bleiben (anonymisiert).",
        tags: ["löschen", "dsgvo"],
      },
      {
        q: "Wer hat Zugriff auf was?",
        a: "• Schüler:in: nur eigene Daten und Klasse, eigene Abgaben + globale Aufgaben + Klassenforum\n• Lehrkraft: alle Daten der eigenen Klassen (auch Co-Lehrer:in mit Einladung)\n• Schulträger / Andere Schulen: KEIN Zugriff — jede Schule ist getrennt\n• Anthropic (KI): bekommt nur was du gerade eintippst beim Generieren, niemals Schülerdaten",
        tags: ["zugriff", "rollen"],
      },
      {
        q: "Wo werden die Daten gespeichert?",
        a: "Aktuell: lokale SQLite-Datenbank auf dem Server, in Deutschland gehostet (für Schul-Setup). Backup täglich, Aufbewahrung 30 Tage. Bei Tailscale-Pilot: auf dem Mac der Lehrkraft, mit eingeschränktem Zugriff über das Tailnet-Netzwerk.",
        tags: ["hosting", "speicher"],
      },
    ],
  },
  {
    id: "technik",
    title: "Technisches & Browser",
    icon: "MonitorSmartphone",
    color: "from-blue-500 to-indigo-500",
    items: [
      {
        q: "Welcher Browser wird unterstützt?",
        a: "Chrome, Safari, Firefox, Edge — jeweils die letzten 2 Versionen. Internet Explorer wird NICHT unterstützt. Auf iPhone: Safari, auf Android: Chrome.",
        tags: ["browser", "kompatibilität"],
      },
      {
        q: "Funktioniert die App auf dem Handy?",
        a: "Ja, sie ist Mobile-optimiert. Schüler:innen können sich am Handy anmelden und alle Aufgaben dort lösen. Die Lehrer-Oberfläche ist auch handytauglich, aber das Klassenzimmer-Panel zeigt sich erst ab Tablet (~1280px). Empfehlung für Lehrkräfte: iPad oder Laptop.\n\nPlus: die App ist eine PWA — über 'Zum Home-Bildschirm hinzufügen' wird sie wie eine App nutzbar.",
        tags: ["mobile", "iphone", "android", "pwa"],
      },
      {
        q: "Kann ich die App offline nutzen?",
        a: "Aktuell nein — alle Aktionen brauchen Verbindung zum Server. Bei zeitweiligem Netzausfall werden Eingaben nicht zwischengespeichert. Ein Offline-Modus ist als Feature-Wunsch im Feedback-Board (Ideen-Pinnwand).",
        tags: ["offline"],
      },
      {
        q: "Wie kann ich die App selbst betreiben (Self-Hosting)?",
        a: "Die App ist Open-Source-ähnlich aufgebaut. Stack: Next.js 16 + SQLite (oder Postgres) + Drizzle ORM + NextAuth v5. Deployment-Optionen: Vercel (einfachster Weg), Hetzner Cloud (~5€/Monat), eigenes NAS/Mac mit launchd + Tailscale.\n\nSchritt-für-Schritt: siehe DEPLOY.md im Repo.",
        tags: ["self-host", "deploy"],
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* HERO */}
      <header className="relative overflow-hidden bg-brand-grad text-white">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <Link
            href="/help"
            className="inline-flex items-center gap-1 mb-6 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Hilfe-Hub
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="w-8 h-8" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Häufige Fragen
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">FAQ</h1>
            </div>
          </div>
          <p className="text-lg text-white/85 max-w-2xl">
            Konkrete Antworten auf konkrete Fragen. Wenn du etwas nicht findest:{" "}
            <Link href="/feedback" className="underline hover:text-white">
              Feedback geben
            </Link>
            .
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <FaqAccordion categories={CATEGORIES} />
      </main>

      <footer className="bg-slate-900 text-white py-8 text-center text-sm text-slate-400">
        <Link href="/help" className="hover:text-white">Hilfe-Hub</Link>
        {" · "}
        <Link href="/tour" className="hover:text-white">Klick-Tour</Link>
        {" · "}
        <Link href="/anleitung" className="hover:text-white">Übersicht</Link>
        {" · "}
        <Link href="/feedback" className="hover:text-white">Feedback</Link>
      </footer>
    </div>
  );
}
