import Link from 'next/link';
import {
  GraduationCap, ArrowRight, ArrowLeft, Sparkles, Users, BookOpen,
  ClipboardList, Layers, BookX, CalendarDays, Activity, Library,
  Map, TrendingUp, Heart, Printer, Send, QrCode, Lightbulb,
} from 'lucide-react';

export const metadata = {
  title: 'Klick-Tour · Test Schule',
  description: 'Bebilderte Schritt-für-Schritt-Anleitung durch alle Funktionen',
};

type Step = {
  n: number;
  title: string;
  text: string;
  image: string;
  highlights?: string[];
  icon?: any;
};

const STEPS_TEACHER: Step[] = [
  {
    n: 1,
    title: 'Anmelden',
    text: 'Als Lehrkraft mit E-Mail + Passwort einloggen. Demo-Konto unten auf der Login-Seite klickbar.',
    image: '/tour/01-login.png',
    highlights: [`Tab 'Lehrkraft' wählen`, 'Demo: lehrer@demo.test / demo1234'],
    icon: GraduationCap,
  },
  {
    n: 2,
    title: 'Dashboard — dein Cockpit',
    text: 'Begrüßungs-Hero zeigt Abgaben heute + aktive Schüler:innen. Darunter: deine Klassen + letzte Aktivitäten. Rechts: das Klassenzimmer-Panel (ab 1280px Breite).',
    image: '/tour/20-dashboard.png',
    highlights: [
      'Gradient-Hero mit Tagesstand',
      'Stat-Karten Klassen / SuS / Aufgaben / Abgaben',
      'Sidebar rechts: Mo-Fr-Tab mit Farbverlauf',
    ],
    icon: Sparkles,
  },
  {
    n: 3,
    title: 'Klasse anlegen',
    text: `Unter 'Klassen & Gruppen' eine neue Klasse erstellen — Name, Jahrgang, Farbe. Bekommt automatisch einen 6-stelligen Code.`,
    image: '/tour/21-klassen.png',
    icon: Users,
  },
  {
    n: 4,
    title: 'Schüler:innen einladen — per QR-Code',
    text: 'In der Klassen-Detail-Ansicht steht oben eine große QR-Karte. Schüler:innen scannen mit der Handy-Kamera → landen direkt auf der vorausgefüllten Anmelde-Seite. Auch Print-Poster mit Anleitung möglich.',
    image: '/tour/22-klasse-detail.png',
    highlights: [
      'QR-Code mit Klassen-Code als großem Mono-Text',
      'Direkt-Link kopieren oder als Poster drucken',
      'Code-Wechsel jederzeit möglich',
    ],
    icon: QrCode,
  },
  {
    n: 5,
    title: 'Aufgaben — die Übersicht',
    text: 'Alle deine Aufgaben mit Typ, Schwierigkeit, Status. Pro Eintrag: Bearbeiten, Duplizieren, Exportieren (Word/PPT/PDF), Live-Quiz starten, löschen.',
    image: '/tour/23-aufgaben.png',
    icon: ClipboardList,
  },
  {
    n: 6,
    title: 'Quiz schreiben — mit KI-Hilfe',
    text: "Neuer Quiz-Editor mit Titel, Klasse, Schwierigkeit. Pro Frage gibt es drei KI-Knöpfe: 'Mit KI generieren' (ganzes Quiz aus Thema), 'Falsche Antworten' (Distraktoren) und 'KI-Vorschlag' für die Erklärung.",
    image: '/tour/24-quiz-editor.png',
    highlights: [
      '✨ KI-Generierung auf Themen-Basis',
      'Auto-Karteikarten-Vorschläge unten rechts',
      'Lehrplan-Zuordnung mit KI-Vorschlag',
      'Klausur-Modus mit Zeitlimit aktivierbar',
    ],
    icon: Sparkles,
  },
  {
    n: 7,
    title: 'Klassenzimmer-Panel — Tagesplanung',
    text: `Persistente Sidebar rechts mit Mo-Fr-Tabs (heute weiß, weitere Tage matter Slate-Verlauf). Drag eine Backlog-Aufgabe auf einen Tab → Fälligkeit gesetzt. Per-Tag-Knopf 'X senden' veröffentlicht alle ungesendeten Aufgaben + schickt Notifications.`,
    image: '/tour/25-klassenzimmer-panel.png',
    highlights: [
      '5-Tage-Mini-Wochenkalender oben',
      'Stundenplan + fällige Aufgaben pro Tag',
      'Backlog unten — Drag & Drop oder Klick-Picker',
      '🔔 Erinnern-Knopf für Nicht-Abgeber',
    ],
    icon: CalendarDays,
  },
  {
    n: 8,
    title: 'Statistik mit Themen-Mastery',
    text: 'Pro Klasse: Stats-Übersicht (SuS, Aufgaben, XP), Heatmap-Themen-Mastery (Schüler×Thema mit Farbcodierung), Detail-Heatmap (Schüler×Aufgabe gruppiert nach Themen). Drei Export-Optionen: CSV, Excel mit 3 Sheets, Druckansicht.',
    image: '/tour/26-statistik.png',
    highlights: [
      'Grün = sicher · Amber = mittel · Rosé = Übungsbedarf',
      'Excel-Export mit Freeze-Panes',
      'Notenliste druckbar als A4-Querformat',
    ],
    icon: TrendingUp,
  },
  {
    n: 9,
    title: 'Karteikarten-System',
    text: 'Beim Schreiben jeder Aufgabe schlägt die App automatisch Karteikarten vor. Akzeptierst du sie, landen sie im Klassen-Stapel und werden Schüler:innen via Spaced Repetition zum Lernen angeboten. Übersicht zeigt alle Stapel + Lern-Aktivität.',
    image: '/tour/27-karteikarten-overview.png',
    icon: Layers,
  },
  {
    n: 10,
    title: 'Karteikarten zum Ausdrucken',
    text: 'Eigene Druckansicht: 4 Karten pro A4-Bogen (2×2), Vorder- und Rückseite getrennt, Rückseite spiegelverkehrt für doppelseitigen Druck. Sky-Akzent für Vorderseite, Violett für Rückseite, Schneide-Linien zwischen den Karten.',
    image: '/tour/28-karteikarten-druck.png',
    icon: Printer,
  },
  {
    n: 11,
    title: 'Lernpfade — Wochenpläne',
    text: 'Strukturierte Mehrwochen-Lernreisen. Auto-Generator verteilt vorhandene Aufgaben sortiert nach Schwierigkeit. Editor zeigt Wochen als Kanban-Spalten — drag tasks zwischen Wochen.',
    image: '/tour/29-lernpfade.png',
    icon: Map,
  },
  {
    n: 12,
    title: 'Vital-Szenarien (Pflege-Spezifisch)',
    text: 'Eigene Patientenfälle anlegen: Name, Alter, Kontext, 7 Vitalwerte (Puls, BD, AF, SpO2, Temp, Bewusstsein), auffällige Werte markieren, korrekte + falsche Maßnahmen. Per-Klick mit KI generieren lassen aus einem Krankheitsbild.',
    image: '/tour/30-vital-szenarien.png',
    icon: Heart,
  },
  {
    n: 13,
    title: 'Bibliothek — Quelle für KI-Ableitungen',
    text: "Sammlung von Lerntexten, Bildern, Links, Begriffen. Pro Text-Item zwei mächtige KI-Knöpfe: '✨ Aufgabe ableiten' (Quiz/Cloze/Card/Case automatisch generieren) und '📖 Glossar extrahieren' (Fachbegriffe + Definitionen automatisch in die Bibliothek übernehmen).",
    image: '/tour/31-bibliothek.png',
    icon: Library,
  },
];

const STEPS_STUDENT: Step[] = [
  {
    n: 1,
    title: 'QR-Code scannen oder Code eingeben',
    text: `Schüler:innen scannen den QR von der Klassen-Detail-Seite oder geben den 6-stelligen Code auf /login ein. Tab 'Schüler:in' + Klassencode + Vorname + selbst gewählte PIN.`,
    image: '/tour/02-login-prefill.png',
    highlights: [
      'Code wird via QR automatisch vorausgefüllt',
      'PIN nur 4 Ziffern — beim ersten Login selbst festlegen',
      'Lehrkraft kann PIN zurücksetzen bei Verlust',
    ],
    icon: QrCode,
  },
  {
    n: 2,
    title: 'Mein Lernraum — Startseite',
    text: `XP-Hero oben, 'Heute zu tun'-Aufgabenliste, Level/Streak-Karten. Direkt zum Arbeiten.`,
    image: '/tour/10-sus-lernraum.png',
    icon: BookOpen,
  },
  {
    n: 3,
    title: 'Aufgaben mit Filtern',
    text: 'Alle veröffentlichten Aufgaben mit Status (überfällig/offen/erledigt), Schwierigkeit, Typ-Emoji. Direkt klickbar.',
    image: '/tour/11-sus-aufgaben.png',
    icon: ClipboardList,
  },
  {
    n: 4,
    title: 'Quiz lösen',
    text: 'Frage + Antworten klicken. Bei Abgabe direktes Feedback. Bei 100% gibt es Konfetti 🎉. Erklärungen werden nach der Abgabe angezeigt.',
    image: '/tour/12-sus-quiz.png',
    icon: Sparkles,
  },
  {
    n: 5,
    title: 'Karteikarten-Trainer (Spaced Repetition)',
    text: 'Heute fällige Karten lernen. Nach Antwort: 4 Bewertungs-Knöpfe (Nochmal · Schwer · Gut · Einfach). SM-2-Algorithmus regelt, wann die Karte wieder erscheint.',
    image: '/tour/13-sus-karteikarten.png',
    icon: Layers,
  },
  {
    n: 6,
    title: 'Fehlerbuch — gezielte Wiederholung',
    text: 'Automatisch gesammelte Aufgaben, bei denen noch Luft nach oben ist. Sortiert nach Schweregrad — direkt klickbar zum Wiederholen.',
    image: '/tour/14-sus-fehlerbuch.png',
    icon: BookX,
  },
  {
    n: 7,
    title: 'Wochenplan mit Lernpfad',
    text: 'Aktive Lernpfade oben mit Fortschritt + Aufgaben-Liste der aktuellen Woche. Stundenplan darunter.',
    image: '/tour/15-sus-wochenplan.png',
    icon: CalendarDays,
  },
  {
    n: 8,
    title: 'Vitalwerte-Simulator',
    text: 'Patient mit Kontext + 7 Vitalwerten. Schritt 1: auffällige Werte markieren. Schritt 2: korrekte Maßnahmen wählen. Auflösung mit Score + Diagnose + Streak-Counter 🔥.',
    image: '/tour/16-sus-vitalsim.png',
    icon: Activity,
  },
];

const FEATURE_HIGHLIGHTS = [
  { icon: Sparkles, label: '10+ KI-Helfer', color: 'from-violet-500 to-fuchsia-500' },
  { icon: QrCode, label: 'QR-Beitritt', color: 'from-sky-500 to-cyan-500' },
  { icon: Send, label: 'Plan & Send', color: 'from-emerald-500 to-teal-500' },
  { icon: Layers, label: 'Spaced Repetition', color: 'from-amber-500 to-orange-500' },
];

export default function TourPage() {
  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950'>
      {/* HERO */}
      <header className='relative overflow-hidden bg-brand-grad text-white'>
        <div className='absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none' />
        <div className='absolute -bottom-32 -left-12 w-[28rem] h-[28rem] rounded-full bg-violet-400/20 blur-3xl pointer-events-none' />
        <div className='relative max-w-6xl mx-auto px-6 py-12 md:py-16'>
          <Link href='/anleitung' className='inline-flex items-center gap-1 mb-6 text-sm text-white/80 hover:text-white'>
            <ArrowLeft className='w-4 h-4' /> Zur Funktionsübersicht
          </Link>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center'>
              <GraduationCap className='w-7 h-7' />
            </div>
            <div>
              <div className='text-xs font-semibold uppercase tracking-wider text-white/70'>Bebilderte Anleitung</div>
              <div className='text-lg font-bold'>Test Schule · Klick-Tour</div>
            </div>
          </div>
          <h1 className='text-3xl md:text-5xl font-bold leading-tight mb-3'>
            In 15 Minuten verstanden, was die App kann.
          </h1>
          <p className='text-lg text-white/85 max-w-2xl'>
            Schritt-für-Schritt-Anleitung mit echten Screenshots — für Lehrkräfte und Schüler:innen, die zum ersten Mal reinschauen.
          </p>

          <div className='mt-6 flex flex-wrap gap-2'>
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, color }, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${color} text-white shadow`}
              >
                <Icon className='w-4 h-4' /> {label}
              </span>
            ))}
          </div>

          {/* Sprung-Navigation */}
          <nav className='mt-8 flex flex-wrap gap-2'>
            <a href='#lehrer' className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-sky-700 font-semibold shadow-lift hover:bg-slate-50'>
              <GraduationCap className='w-4 h-4' /> Für Lehrkräfte
            </a>
            <a href='#schueler' className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 backdrop-blur border border-white/20 text-white font-medium hover:bg-white/25'>
              <BookOpen className='w-4 h-4' /> Für Schüler:innen
            </a>
          </nav>
        </div>
      </header>

      {/* LEHRER */}
      <section id='lehrer' className='scroll-mt-8 max-w-6xl mx-auto px-6 py-12'>
        <SectionHeader
          kicker='Für Lehrkräfte'
          title='Vom Login bis zum ersten KI-Quiz'
          color='from-sky-500 to-cyan-500'
          icon={GraduationCap}
        />
        <div className='space-y-12 mt-10'>
          {STEPS_TEACHER.map((step) => (
            <StepCard key={step.n} step={step} accent='sky' />
          ))}
        </div>
      </section>

      {/* SCHÜLER */}
      <section id='schueler' className='scroll-mt-8 max-w-6xl mx-auto px-6 py-12 bg-emerald-50/30 dark:bg-emerald-900/10'>
        <SectionHeader
          kicker='Für Schüler:innen'
          title='In 30 Sekunden anmelden, in 5 Minuten loslegen'
          color='from-emerald-500 to-teal-500'
          icon={BookOpen}
        />
        <div className='space-y-12 mt-10'>
          {STEPS_STUDENT.map((step) => (
            <StepCard key={step.n} step={step} accent='emerald' />
          ))}
        </div>
      </section>

      {/* CTA */}
      <footer className='bg-slate-900 text-white py-12 mt-12'>
        <div className='max-w-3xl mx-auto px-6 text-center'>
          <Sparkles className='w-10 h-10 text-sky-400 mx-auto mb-3' />
          <h2 className='text-2xl font-bold mb-2'>Genug gelesen — selbst ausprobieren</h2>
          <p className='text-slate-300 mb-6'>
            Demo-Login: <code className='bg-slate-800 px-2 py-0.5 rounded text-amber-300'>lehrer@demo.test</code> / <code className='bg-slate-800 px-2 py-0.5 rounded text-amber-300'>demo1234</code>
            <br />Schüler-Code: <code className='bg-slate-800 px-2 py-0.5 rounded text-amber-300'>DEMO01</code>
          </p>
          <Link
            href='/login'
            className='inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lift transition'
          >
            Direkt anmelden <ArrowRight className='w-4 h-4' />
          </Link>
          <p className='mt-6 text-xs text-slate-400'>
            <Link href='/anleitung' className='hover:text-white underline'>Vollständige Funktionsübersicht</Link>
            {' · '}
            <Link href='/feedback' className='hover:text-white underline'>Idee / Feedback</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({
  kicker, title, color, icon: Icon,
}: {
  kicker: string; title: string; color: string; icon: any;
}) {
  return (
    <div className='text-center'>
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${color} text-white text-xs font-semibold uppercase tracking-wider mb-3`}>
        <Icon className='w-3.5 h-3.5' /> {kicker}
      </div>
      <h2 className='text-2xl md:text-3xl font-bold'>{title}</h2>
    </div>
  );
}

function StepCard({ step, accent }: { step: Step; accent: 'sky' | 'emerald' }) {
  const Icon = step.icon ?? Sparkles;
  const accentClasses = accent === 'sky'
    ? { ring: 'ring-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-600 dark:text-sky-300' }
    : { ring: 'ring-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-300' };
  return (
    <div className='grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start'>
      {/* Text-Karte */}
      <div className='rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-card border border-slate-200 dark:border-slate-800'>
        <div className='flex items-center gap-3 mb-3'>
          <div className={`w-12 h-12 rounded-xl ${accentClasses.bg} flex items-center justify-center ring-2 ${accentClasses.ring} ring-offset-2 ring-offset-white dark:ring-offset-slate-900`}>
            <span className={`font-bold text-lg ${accentClasses.text}`}>{step.n}</span>
          </div>
          <Icon className={`w-5 h-5 ${accentClasses.text}`} />
        </div>
        <h3 className='text-xl font-bold mb-2'>{step.title}</h3>
        <p className='text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>{step.text}</p>
        {step.highlights && (
          <ul className='mt-4 space-y-1.5'>
            {step.highlights.map((h, i) => (
              <li key={i} className={`text-xs flex items-start gap-2 ${accentClasses.text}`}>
                <span className='font-bold mt-0.5'>›</span>
                <span className='text-slate-600 dark:text-slate-300'>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bild */}
      <div className='rounded-2xl overflow-hidden shadow-lift border border-slate-200 dark:border-slate-800 bg-slate-900'>
        <img
          src={step.image}
          alt={step.title}
          className='w-full h-auto block'
          loading='lazy'
        />
      </div>
    </div>
  );
}
