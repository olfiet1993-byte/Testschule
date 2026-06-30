import Link from "next/link";
import {
  GraduationCap, ArrowRight, ArrowLeft, MousePointerClick,
  BookOpen, HelpCircle, MessageCircle, Lightbulb, Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Hilfe-Hub · Test Schule",
  description: "Anleitung, Klick-Tour und FAQ — alles an einem Ort",
};

type HubCard = {
  href: string;
  badge: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bullets: string[];
  cta: string;
};

const CARDS: HubCard[] = [
  {
    href: "/tour",
    badge: "BEBILDERT",
    title: "Klick-Tour",
    description:
      "Schritt-für-Schritt durch alle wichtigen Funktionen mit echten Screenshots. Für Erstnutzer:innen die beste Wahl.",
    icon: MousePointerClick,
    color: "from-sky-500 to-cyan-500",
    bullets: [
      "13 Lehrer-Schritte mit Screenshots",
      "7 Schüler-Schritte",
      "ca. 15 Minuten zum Durchlesen",
    ],
    cta: "Tour starten",
  },
  {
    href: "/anleitung",
    badge: "ÜBERSICHT",
    title: "Funktionsübersicht",
    description:
      "Was die App alles kann — kompakte Liste aller Features für Lehrkräfte und Schüler:innen. Gut als Referenz.",
    icon: BookOpen,
    color: "from-violet-500 to-fuchsia-500",
    bullets: [
      "Alle Funktionen auf einer Seite",
      "Mit Demo-Zugangsdaten zum Teilen",
      "Stack + DSGVO-Hinweise",
    ],
    cta: "Übersicht ansehen",
  },
  {
    href: "/help/faq",
    badge: "FAQ",
    title: "Häufige Fragen",
    description:
      "Konkrete Probleme + Lösungen. Schüler hat PIN vergessen? Klausur freischalten? Drag & Drop auf Touch?",
    icon: HelpCircle,
    color: "from-amber-500 to-orange-500",
    bullets: [
      "Anmeldung & Konten",
      "Aufgaben, Karteikarten, Klausur",
      "Datenschutz & Technik",
    ],
    cta: "FAQ öffnen",
  },
];

export default function HelpHubPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* HERO */}
      <header className="relative overflow-hidden bg-brand-grad text-white">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-12 w-[28rem] h-[28rem] rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 mb-8 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zur Anmeldung
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Hilfe-Hub
              </div>
              <div className="text-lg font-bold">Test Schule</div>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">
            Wie kann ich dir helfen?
          </h1>
          <p className="text-lg text-white/85 max-w-2xl">
            Drei Wege, um die App schnell zu verstehen — wähle den passenden
            Einstieg.
          </p>
        </div>
      </header>

      {/* 3 GROSSE KARTEN */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-card hover-lift transition flex flex-col"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md mb-4`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                  {card.badge}
                </div>
                <h2 className="font-bold text-lg mb-2">{card.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                  {card.description}
                </p>
                <ul className="space-y-1 mb-5">
                  {card.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-500 flex items-start gap-2"
                    >
                      <Sparkles className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-sky-600 dark:text-sky-400 group-hover:gap-2 transition-all">
                  {card.cta} <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Zweite Reihe — Sekundäre Hilfen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Etwas fehlt? Idee?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Schicke uns deinen Verbesserungsvorschlag direkt in der App. Wir
              lesen jeden.
            </p>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline"
            >
              Feedback geben <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold">Hilfe von Lehrkraft / Mitschüler</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              In jeder Klasse gibt es ein Forum — Fragen stellen, andere
              helfen. Lehrer-Antworten sind hervorgehoben.
            </p>
            <Link
              href="/sus/forum"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Forum öffnen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tipp */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-violet-50 dark:from-sky-900/20 dark:to-violet-900/20 border border-sky-200/50 dark:border-sky-900/40 p-6 flex items-start gap-3">
          <GraduationCap className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-1">Tipp für Lehrkräfte</strong>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Schicke deinen Schüler:innen den Link{" "}
              <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-sky-700 dark:text-sky-300 font-mono text-xs">
                /tour
              </code>{" "}
              vor der ersten Stunde — dann wissen sie schon, wie die App
              funktioniert. Du kannst die Tour auch als Poster ausdrucken
              (Cmd+P im Browser).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
