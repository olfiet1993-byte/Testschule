/**
 * SM-2 Spaced-Repetition-Algorithmus (vereinfacht).
 * Bewertungen: again (1), hard (2), good (3), easy (4)
 */

export type Rating = "again" | "hard" | "good" | "easy";

export interface ReviewState {
  ease: number;       // 1.3 – ∞ (Anki-style)
  interval: number;   // Tage bis nächste Wiederholung
  repetitions: number;
  lapses: number;
}

export interface NextReview extends ReviewState {
  dueAt: Date;
}

const RATING_QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export function scheduleNext(state: ReviewState, rating: Rating, now: Date = new Date()): NextReview {
  const q = RATING_QUALITY[rating];
  let { ease, interval, repetitions, lapses } = state;

  if (q < 3) {
    // Falsch beantwortet → Repetition zurücksetzen
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease);
    }
    if (rating === "easy") interval = Math.round(interval * 1.3);
  }

  // Ease-Anpassung (SM-2 Formel)
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  // Cap auf 365 Tage
  if (interval > 365) interval = 365;

  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + interval);

  return { ease, interval, repetitions, lapses, dueAt };
}

/**
 * Schätzt das nächste Intervall (für Vorschau-Buttons), ohne State zu mutieren.
 */
export function previewIntervals(state: ReviewState): Record<Rating, number> {
  return {
    again: 1,
    hard: scheduleNext(state, "hard").interval,
    good: scheduleNext(state, "good").interval,
    easy: scheduleNext(state, "easy").interval,
  };
}
