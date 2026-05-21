"use client";

import { Button } from "@/components/ui/Button";
import { Printer, ArrowLeft, GraduationCap, Scissors } from "lucide-react";
import Link from "next/link";

type Deck = {
  deckId: string;
  deckName: string;
  cards: Array<{ id: string; front: string; back: string; hint?: string | null }>;
};

/**
 * Druck-Layout: 4 Karten pro A4-Seite (2×2), Vorder- + Rückseite getrennt.
 * Mit Brand-Akzent, Schneide-Linien, abgerundeten Ecken — fühlt sich an
 * wie ein hochwertig vorbereiteter Karten-Bogen.
 */
export function FlashcardsPrint({
  className,
  decks,
}: {
  className: string;
  decks: Deck[];
}) {
  // Karten in 4er-Gruppen splitten (für 2×2-Layout)
  const pages: Array<{ deckName: string; cards: Deck["cards"] }> = [];
  decks.forEach((d) => {
    for (let i = 0; i < d.cards.length; i += 4) {
      pages.push({
        deckName: d.deckName,
        cards: d.cards.slice(i, i + 4),
      });
    }
  });

  return (
    <div className="p-6 max-w-[900px] mx-auto print:p-0 print:max-w-none bg-slate-50 print:bg-white text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
          html, body {
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .card-page { page-break-after: always; }
          .card-page:last-child { page-break-after: auto; }
        }
        /* Schneide-Linien via SVG-Pattern für sauberen Druck */
        .cut-corner-tl::before, .cut-corner-tr::before,
        .cut-corner-bl::before, .cut-corner-br::before {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: #cbd5e1;
          border-style: dashed;
        }
      `}</style>

      {/* No-print Header */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="#"
          onClick={(e) => { e.preventDefault(); window.history.back(); }}
          className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Drucken / als PDF speichern
        </Button>
      </div>

      {/* No-print Hinweis-Box */}
      <div className="no-print mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-3">
        <Scissors className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong className="block mb-1">Beidseitig drucken</strong>
          Zuerst die Vorderseiten-Bögen drucken (Seiten 1, 3, 5, …), dann Papier
          wenden und die Rückseiten drucken (Seiten 2, 4, 6, …). Anschließend
          entlang der Schnittlinien zerschneiden.
        </div>
      </div>

      {pages.length === 0 && (
        <div className="text-center py-12 text-slate-400 italic">
          Keine Karten zum Drucken vorhanden.
        </div>
      )}

      {pages.map((page, pi) => {
        const cards = page.cards;
        return (
          <div key={pi}>
            {/* Vorderseite */}
            <PrintPage
              title={page.deckName}
              subtitle="Vorderseite"
              sheetNumber={pi * 2 + 1}
              className={className}
              accentColor="#0EA5E9"
              cards={cards.map((c) => ({ id: c.id, primary: c.front, hint: c.hint }))}
            />
            {/* Rückseite (gespiegelte Spalte für doppelseitigen Druck) */}
            <PrintPage
              title={page.deckName}
              subtitle="Rückseite"
              sheetNumber={pi * 2 + 2}
              className={className}
              accentColor="#8B5CF6"
              cards={mirror(cards).map((c) => ({ id: c?.id ?? "blank-" + Math.random(), primary: c?.back ?? "" }))}
            />
          </div>
        );
      })}
    </div>
  );
}

function mirror<T>(cards: T[]): T[] {
  const out: T[] = [];
  while (cards.length % 2 !== 0) cards.push(undefined as any);
  for (let i = 0; i < cards.length; i += 2) {
    out.push(cards[i + 1]);
    out.push(cards[i]);
  }
  return out;
}

function PrintPage({
  title,
  subtitle,
  sheetNumber,
  className,
  accentColor,
  cards,
}: {
  title: string;
  subtitle: string;
  sheetNumber: number;
  className: string;
  accentColor: string;
  cards: Array<{ id: string; primary: string; hint?: string | null }>;
}) {
  return (
    <div className="card-page mb-12 break-after-page bg-white rounded-xl p-5 print:p-0 shadow-sm print:shadow-none">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-3 mb-4 border-b-2"
        style={{ borderColor: accentColor }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
            style={{ background: accentColor }}
          >
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">{title}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{subtitle} · {className}</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Bogen {sheetNumber}
        </div>
      </div>

      {/* 2×2 Karten-Grid mit Schnittlinien */}
      <div
        className="relative grid grid-cols-2 grid-rows-2"
        style={{ aspectRatio: "1 / 1.15" }}
      >
        {/* Horizontale Schnittlinie */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px pointer-events-none"
          style={{
            background: "repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 6px, transparent 6px, transparent 12px)",
          }}
        />
        {/* Vertikale Schnittlinie */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px pointer-events-none"
          style={{
            background: "repeating-linear-gradient(to bottom, #cbd5e1 0, #cbd5e1 6px, transparent 6px, transparent 12px)",
          }}
        />
        {Array.from({ length: 4 }).map((_, i) => {
          const card = cards[i];
          return (
            <FlashCard
              key={i}
              card={card}
              accentColor={accentColor}
              index={i}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
        <span>Test Schule · Pflegeausbildung</span>
        <span style={{ color: accentColor }}>● {title}</span>
      </div>
    </div>
  );
}

function FlashCard({
  card,
  accentColor,
  index,
}: {
  card: { primary: string; hint?: string | null } | undefined;
  accentColor: string;
  index: number;
}) {
  if (!card) {
    return (
      <div className="p-6 flex items-center justify-center text-slate-200 text-xs">
        — leer —
      </div>
    );
  }
  return (
    <div className="relative p-6 flex flex-col items-center justify-center text-center min-h-[180px]">
      {/* Eckmarken — Schnitthilfe */}
      <Tick position="tl" />
      <Tick position="tr" />
      <Tick position="bl" />
      <Tick position="br" />

      {/* Akzent-Streifen oben */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
        style={{ background: accentColor }}
      />

      {/* Karten-Inhalt */}
      <div className="mt-4">
        <div className="text-base font-medium leading-snug whitespace-pre-wrap">
          {card.primary}
        </div>
        {card.hint && (
          <p className="text-[10px] text-slate-400 italic mt-3 px-2">
            💡 {card.hint}
          </p>
        )}
      </div>
    </div>
  );
}

function Tick({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-3 h-3 pointer-events-none";
  const positionClass = {
    tl: "top-1 left-1 border-t border-l",
    tr: "top-1 right-1 border-t border-r",
    bl: "bottom-1 left-1 border-b border-l",
    br: "bottom-1 right-1 border-b border-r",
  }[position];
  return <div className={`${base} ${positionClass} border-slate-300`} />;
}
