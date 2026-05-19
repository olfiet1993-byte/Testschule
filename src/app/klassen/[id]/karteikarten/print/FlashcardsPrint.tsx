"use client";

import { Button } from "@/components/ui/Button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Deck = {
  deckId: string;
  deckName: string;
  cards: Array<{ id: string; front: string; back: string; hint?: string | null }>;
};

/**
 * Druck-Layout: 4 Karten pro A4-Seite (2×2), Vorder- + Rückseite getrennt.
 * Schneide-Linien zwischen den Karten.
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
    <div className="p-6 max-w-[1000px] mx-auto print:p-0 print:max-w-none bg-white text-slate-900">
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
        .cut-line {
          background-image: repeating-linear-gradient(
            to right,
            #cbd5e1 0,
            #cbd5e1 6px,
            transparent 6px,
            transparent 12px
          );
        }
        .cut-line-vertical {
          background-image: repeating-linear-gradient(
            to bottom,
            #cbd5e1 0,
            #cbd5e1 6px,
            transparent 6px,
            transparent 12px
          );
        }
      `}</style>

      {/* No-print Header */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/klassen/${decks[0] ? "" : ""}`}
          onClick={(e) => { e.preventDefault(); window.history.back(); }}
          className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Drucken / als PDF speichern
        </Button>
      </div>

      {/* No-print Hinweis */}
      <div className="no-print mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <strong>Tipp zum Drucken:</strong> Zuerst die Vorderseiten-Bögen drucken (Seiten 1, 3, 5, …),
        dann Papier wenden und die Rückseiten-Bögen drucken (Seiten 2, 4, 6, …) — Karteikarten ausschneiden.
      </div>

      {pages.length === 0 && (
        <p className="text-center text-slate-500 italic">
          Keine Karten zum Drucken vorhanden.
        </p>
      )}

      {pages.map((page, pi) => {
        const cards = page.cards;
        return (
          <div key={pi}>
            {/* Vorderseite */}
            <PrintPage
              title={`${page.deckName} — Vorderseite (Bogen ${pi * 2 + 1})`}
              className={className}
              cards={cards.map((c) => ({ id: c.id, primary: c.front, hint: c.hint }))}
            />
            {/* Rückseite (gespiegelte Spalte für doppelseitigen Druck) */}
            <PrintPage
              title={`${page.deckName} — Rückseite (Bogen ${pi * 2 + 2})`}
              className={className}
              cards={mirror(cards).map((c) => ({ id: c?.id ?? "blank-" + Math.random(), primary: c?.back ?? "" }))}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vertauscht die Spaltenanordnung pro Reihe, damit beim doppelseitigen Drucken
 * Vorder- und Rückseite auf derselben physischen Karte landen.
 * Layout 2×2:  [0][1] / [2][3]  →  Rückseite: [1][0] / [3][2]
 */
function mirror<T>(cards: T[]): T[] {
  const out: T[] = [];
  // Auffüllen auf 4er-Reihen
  while (cards.length % 2 !== 0) cards.push(undefined as any);
  for (let i = 0; i < cards.length; i += 2) {
    out.push(cards[i + 1]);
    out.push(cards[i]);
  }
  return out;
}

function PrintPage({
  title,
  className,
  cards,
}: {
  title: string;
  className: string;
  cards: Array<{ id: string; primary: string; hint?: string | null }>;
}) {
  return (
    <div className="card-page mb-8 break-after-page">
      <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider flex items-center justify-between">
        <span>{title}</span>
        <span>{className}</span>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-0 border border-slate-300" style={{ aspectRatio: "1 / 1.1" }}>
        {Array.from({ length: 4 }).map((_, i) => {
          const card = cards[i];
          return (
            <div
              key={i}
              className={`p-4 flex items-center justify-center text-center bg-white ${
                i % 2 === 0 ? "border-r border-slate-300" : ""
              } ${i < 2 ? "border-b border-slate-300" : ""}`}
              style={{ minHeight: "150px" }}
            >
              {card ? (
                <div>
                  <div className="text-base font-medium leading-snug">
                    {card.primary}
                  </div>
                  {card.hint && (
                    <p className="text-[10px] text-slate-400 italic mt-2">{card.hint}</p>
                  )}
                </div>
              ) : (
                <span className="text-slate-200 text-[10px]">— leer —</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
