import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  Users,
  CalendarDays,
  MessageCircle,
  Map,
  Printer,
  Sparkles,
  Lightbulb,
  Trophy,
  Bell,
  Library,
  HelpCircle,
  Shield,
  TrendingUp,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

export const metadata = {
  title: "Anleitung · Test Schule",
  description: "Funktionsübersicht und Bedienungsanleitung der Test-Schule-Plattform",
};

export default function AnleitungPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header / Hero */}
      <header className="relative overflow-hidden bg-brand-grad text-white">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-12 w-[28rem] h-[28rem] rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16">
          <Link href="/login" className="inline-flex items-center gap-2 mb-8 text-sm text-white/80 hover:text-white">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold leading-tight">Test Schule</div>
              <div className="text-[11px] text-white/70 leading-tight">Lernplattform für die Pflegeausbildung</div>
            </div>
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">
            Was die App alles kann.
          </h1>
          <p className="text-lg text-white/85 max-w-2xl">
            Eine schnelle Tour durch alle Funktionen — für Lehrkräfte und Schüler:innen.
            Falls du nur ausprobieren willst: weiter unten findest du die Demo-Zugänge.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-sky-600 font-semibold shadow-lift hover:bg-slate-50 transition">
              Direkt anmelden <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#demo" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 backdrop-blur border border-white/20 text-white font-medium hover:bg-white/25 transition">
              Demo-Zugänge ansehen
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Quick-Facts */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { n: "5", label: "Aufgabentypen", color: "from-sky-500 to-cyan-500" },
            { n: "PWA", label: "iPhone-fähig", color: "from-emerald-500 to-teal-500" },
            { n: "Live", label: "Quiz mit SSE", color: "from-violet-500 to-fuchsia-500" },
            { n: "DSGVO", label: "Export & Löschung", color: "from-amber-500 to-orange-500" },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center shadow-card hover-lift">
              <div className={`inline-block text-3xl font-bold bg-gradient-to-r ${f.color} bg-clip-text text-transparent`}>{f.n}</div>
              <div className="text-xs text-slate-500 mt-1">{f.label}</div>
            </div>
          ))}
        </section>

        {/* Für Lehrkräfte */}
        <section>
          <SectionTitle
            icon={GraduationCap}
            color="sky"
            kicker="Für Lehrkräfte"
            title="Klassen führen, Aufgaben gestalten, Fortschritt sehen"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Feature
              icon={Users}
              title="Klassen & Schüler:innen"
              text="Klassen anlegen, mit 6-stelligem Code einladen. Co-Lehrkräfte hinzufügen, Profile sehen, Notizen je Schüler:in führen."
              bullets={["Klassenfarbe & Jahrgang", "Co-Teacher-Modus", "Schüler-Notizen privat oder geteilt"]}
            />
            <Feature
              icon={ClipboardList}
              title="5 Aufgabentypen"
              text="Quiz, Lückentext, Karteikarten, Fallstudie und Bildhotspot. Mit Schwierigkeit, XP-Belohnung und optionalem Themenbezug."
              bullets={["Quiz mit Mehrfachantworten + Erklärung", "Cloze: {{Antwort}}-Syntax mit Synonymen", "Fallstudien mit Situations- & Reaktionsfragen", "Bildhotspots: SVG-Marker setzen"]}
            />
            <Feature
              icon={Library}
              title="Inhalts-Bibliothek"
              text="Lerntexte und Mediendateien in der Klasse teilen. Markdown unterstützt, Themen zur Gliederung."
            />
            <Feature
              icon={TrendingUp}
              title="Statistik & Notenliste"
              text="Klassenstatistik mit Schüler×Aufgabe-Matrix, Druckansicht im A4-Querformat, CSV-Export für Excel."
              bullets={["Notenschlüssel 1–6", "Pro Schüler:in & pro Aufgabe Ø %", "Druckbar als PDF"]}
            />
            <Feature
              icon={Map}
              title="Lernpfade / Wochenplan"
              text="Strukturierte Lernreisen über mehrere Wochen. Auto-Generator verteilt Aufgaben sortiert nach Schwierigkeit."
              bullets={["1–26 Wochen", "Kanban je Woche, Drag-to-move", "Auto-Verteilung leicht→schwer"]}
            />
            <Feature
              icon={CalendarDays}
              title="Stundenplan"
              text="Klassischer Wochenplan mit Räumen, Themen und Co-Lehrkräften. Verbindet sich mit Lernpfaden."
            />
            <Feature
              icon={Zap}
              title="Klausur-Modus"
              text="Aufgaben als Klausur freischalten: einmaliger Versuch, Timer, Auflösung erst auf Lehrer-Click sichtbar."
              bullets={["Zeitlimit in Minuten", "Sperrgate vor dem Start", "Auflösung manuell freigeben"]}
            />
            <Feature
              icon={MessageCircle}
              title="Forum, Nachrichten & Notifications"
              text="Klassenforum für Q&A (markierbar als gelöst), 1:1-Nachrichten und Live-Glocke für neue Ereignisse."
            />
          </div>
        </section>

        {/* Für Schüler:innen */}
        <section>
          <SectionTitle
            icon={BookOpen}
            color="emerald"
            kicker="Für Schüler:innen"
            title="Lernen mit Spielmechanik und klarem Wochenplan"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Feature
              icon={BookOpen}
              title="Aufgaben lösen"
              text="Filter nach Status & Schwierigkeit, sofortiges Feedback, Erklärungen sichtbar nach Abgabe."
              bullets={["Konfetti bei 100% 🎉", "XP & Level-System", "Schwierigkeits-Badges (leicht/mittel/schwer)"]}
            />
            <Feature
              icon={CalendarDays}
              title="Mein Wochenplan"
              text="Aktueller Lernpfad mit Fortschrittsbalken oben drauf, darunter der Stundenplan."
              bullets={["Was muss diese Woche fertig sein?", "Fortschritt: erledigt/offen", "Direktlink zur Aufgabe"]}
            />
            <Feature
              icon={Trophy}
              title="Profil & Streak"
              text="XP, Level, Streak-Tage, Aktivitäts-Heatmap. Avatar mit Emoji + Farbe wählbar."
              bullets={["Persönlicher Avatar", "Wer ist der Klassenheld?", "Datenexport (DSGVO)"]}
            />
            <Feature
              icon={MessageCircle}
              title="Forum & Fragen"
              text={"Fragen an die Klasse stellen, Antworten der Lehrkraft sind hervorgehoben, Markieren als „gelöst“."}
            />
          </div>
        </section>

        {/* Was hinter den Kulissen passiert */}
        <section>
          <SectionTitle
            icon={Shield}
            color="violet"
            kicker="Datenschutz & Sicherheit"
            title="DSGVO-konform und auf deinem eigenen Server"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <SmallFeature icon={Shield} title="Daten gehören dir" text="Lokale SQLite-Datenbank, automatische Backups, kein Tracking, keine Werbung." />
            <SmallFeature icon={FileSpreadsheet} title="Datenexport" text="Schüler:innen können ihre eigenen Daten als JSON exportieren (DSGVO Art. 20)." />
            <SmallFeature icon={Bell} title="Audit-Log" text="Alle wichtigen Aktionen werden protokolliert — wer hat wann was getan." />
          </div>
        </section>

        {/* Quick-Start */}
        <section>
          <SectionTitle
            icon={Sparkles}
            color="amber"
            kicker="So fängst du an"
            title="In drei Minuten loslegen"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <StepCard n={1} title="Anmelden" text="Lehrkraft oder Schüler:in wählen. Beim ersten Schüler-Login wird die PIN gesetzt." />
            <StepCard n={2} title="Klasse + Aufgaben" text="Lehrer:in: neue Klasse anlegen, Code teilen, erste Aufgabe erstellen und veröffentlichen." />
            <StepCard n={3} title="Lernen!" text="Schüler:innen lösen Aufgaben, sammeln XP, Lehrkraft sieht Fortschritt live." />
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="scroll-mt-12">
          <SectionTitle
            icon={Lightbulb}
            color="amber"
            kicker="Selbst ausprobieren"
            title="Demo-Zugänge"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-900 bg-white dark:bg-slate-900 p-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-bold">Lehrkraft-Konto</h3>
                  <p className="text-xs text-slate-500">Sieht Klassen, Statistik, alles</p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-500 w-20 flex-shrink-0">E-Mail:</dt>
                  <dd><code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">lehrer@demo.test</code></dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-500 w-20 flex-shrink-0">Passwort:</dt>
                  <dd><code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">demo1234</code></dd>
                </div>
              </dl>
              <Link href="/login" className="mt-4 inline-flex items-center gap-1 text-sm text-sky-600 hover:underline font-medium">
                Als Lehrkraft anmelden <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-6 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold">Schüler:in-Zugang</h3>
                  <p className="text-xs text-slate-500">Über Klassen-Code</p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-500 w-20 flex-shrink-0">Code:</dt>
                  <dd><code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono tracking-wider">DEMO01</code></dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-500 w-20 flex-shrink-0">Name:</dt>
                  <dd className="text-slate-600">beliebig (z.&nbsp;B. Max M.)</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-500 w-20 flex-shrink-0">PIN:</dt>
                  <dd className="text-slate-600">selbst wählen (4–12 Ziffern)</dd>
                </div>
              </dl>
              <Link href="/login" className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline font-medium">
                Als Schüler:in anmelden <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            💡 Tipp: In der Demo-Klasse sind bereits Aufgaben, ein Lernpfad und ein Stundenplan angelegt.
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pt-8 border-t border-slate-200 dark:border-slate-800">
          <p>Test Schule · Eine Lernplattform für die Pflegeausbildung</p>
          <p className="mt-1">
            Fragen oder Ideen? <Link href="/feedback" className="text-sky-600 hover:underline">Feedback geben</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  color,
  kicker,
  title,
}: {
  icon: any;
  color: "sky" | "emerald" | "violet" | "amber";
  kicker: string;
  title: string;
}) {
  const colorMap = {
    sky: "from-sky-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    violet: "from-violet-500 to-fuchsia-500",
    amber: "from-amber-500 to-orange-500",
  };
  return (
    <div className="text-center mb-4">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${colorMap[color]} text-white text-xs font-semibold uppercase tracking-wider mb-3`}>
        <Icon className="w-3.5 h-3.5" /> {kicker}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
  bullets,
}: {
  icon: any;
  title: string;
  text: string;
  bullets?: string[];
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-card hover-lift">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/40 dark:to-cyan-900/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
          {bullets && (
            <ul className="mt-3 space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallFeature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-card">
      <Icon className="w-5 h-5 text-violet-500 mb-2" />
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-card relative">
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center shadow-lift">
        {n}
      </div>
      <h3 className="font-semibold mt-2 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}
