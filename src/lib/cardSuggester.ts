/**
 * Heuristische Karteikarten-Vorschläge aus Aufgaben-Inhalten.
 * Läuft komplett im Client — kein KI-Aufruf nötig.
 */

export type Suggestion = { front: string; back: string; hint?: string | null };

/** Cloze-Text: jeder Satz mit {{...}} wird zu einer Karte. */
export function suggestFromCloze(text: string, blanks: { answers: string[] }[]): Suggestion[] {
  if (!text || !blanks?.length) return [];
  // Sätze splitten (grob: an . ! ? Zeilenumbrüchen)
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const out: Suggestion[] = [];
  let blankIdx = 0;
  for (const sentence of sentences) {
    const matches = sentence.match(/\{\{[^}]*\}\}/g);
    if (!matches) continue;
    // Pro Satz eine Karte mit allen Lücken
    const fronts: string[] = [];
    const backs: string[] = [];
    let display = sentence;
    matches.forEach(() => {
      const b = blanks[blankIdx];
      if (!b) return;
      const answer = b.answers[0] ?? "…";
      display = display.replace(/\{\{[^}]*\}\}/, "____");
      backs.push(answer);
      blankIdx++;
    });
    if (fronts.length === 0 && backs.length) {
      out.push({
        front: display,
        back: backs.join(" · "),
      });
    }
  }
  return out;
}

/** Quiz: jede Frage + richtige Antwort wird zu einer Karte. */
export function suggestFromQuiz(
  questions: { question: string; options: string[]; correctIndex: number; explanation?: string }[],
): Suggestion[] {
  if (!questions?.length) return [];
  return questions
    .filter((q) => q.question?.trim() && q.options?.[q.correctIndex])
    .map((q) => ({
      front: q.question.trim(),
      back: q.options[q.correctIndex],
      hint: q.explanation?.trim() || null,
    }));
}

/** Case Study (Schritt-Variante): Frage + richtige Option je Schritt. */
export function suggestFromCase(
  steps: { description?: string; question: string; options: { text: string; isCorrect: boolean; feedback?: string }[] }[],
): Suggestion[] {
  if (!steps?.length) return [];
  const out: Suggestion[] = [];
  for (const s of steps) {
    if (!s.question?.trim()) continue;
    const correct = s.options?.find((o) => o.isCorrect && o.text?.trim());
    if (!correct) continue;
    out.push({
      front: s.question.trim(),
      back: correct.text.trim(),
      hint: correct.feedback?.trim() || null,
    });
  }
  return out;
}

/** Flashcards: 1:1 — schon Karten. */
export function suggestFromFlashcards(cards: { front: string; back: string }[]): Suggestion[] {
  if (!cards?.length) return [];
  return cards.filter((c) => c.front?.trim() && c.back?.trim());
}

/** Lerntext (Bibliothek): Titel + Body, falls Body kurz genug. */
export function suggestFromContent(title: string, body: string): Suggestion[] {
  if (!title?.trim() || !body?.trim()) return [];
  const out: Suggestion[] = [];
  // Markdown-Listen erkennen (- xxx oder * xxx oder 1. xxx)
  const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // "- Begriff: Erklärung" oder "**Begriff:** Erklärung"
    const m = line.match(/^[\-\*]\s+\*{0,2}([^*:]+?)\*{0,2}\s*[:\-]\s*(.+)$/);
    if (m) {
      out.push({ front: m[1].trim(), back: m[2].trim() });
    }
  }
  // Fallback: eine Karte „Was beschreibt: <titel>?" → erste 200 Zeichen
  if (out.length === 0) {
    out.push({ front: `Was beschreibt: „${title.trim()}"?`, back: body.slice(0, 200).trim() });
  }
  return out;
}
