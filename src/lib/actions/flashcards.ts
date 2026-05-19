"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { flashcardDecks, flashcards, cardReviews, classMembers, classes } from "@/db/schema";
import { canManageClass } from "@/lib/permissions";
import { and, eq, inArray, lte, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { scheduleNext, type Rating } from "@/lib/sm2";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}
async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Nicht autorisiert");
  return session.user;
}

export async function createDeck(input: {
  classId: string;
  topicId?: string | null;
  name: string;
  description?: string | null;
  source?: "manual" | "auto_task" | "auto_content";
  sourceTaskId?: string | null;
}) {
  const teacher = await requireTeacher();
  if (!(await canManageClass(teacher.id, input.classId))) throw new Error("Keine Berechtigung");
  if (!input.name.trim()) throw new Error("Name fehlt");
  const [d] = await db.insert(flashcardDecks).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    source: input.source ?? "manual",
    sourceTaskId: input.sourceTaskId ?? null,
    createdBy: teacher.id,
    createdAt: new Date(),
  }).returning();
  revalidatePath(`/klassen/${input.classId}/karteikarten`);
  return d.id;
}

export async function addCardsToDeck(input: {
  deckId: string;
  cards: { front: string; back: string; hint?: string | null }[];
}) {
  const teacher = await requireTeacher();
  const deck = await db.query.flashcardDecks.findFirst({ where: eq(flashcardDecks.id, input.deckId) });
  if (!deck) throw new Error("Stapel nicht gefunden");
  if (!(await canManageClass(teacher.id, deck.classId))) throw new Error("Keine Berechtigung");

  const cleaned = input.cards
    .map((c) => ({ front: c.front.trim(), back: c.back.trim(), hint: c.hint?.trim() || null }))
    .filter((c) => c.front && c.back);
  if (cleaned.length === 0) return 0;

  // Position fortzählen
  const existing = await db.query.flashcards.findMany({ where: eq(flashcards.deckId, input.deckId) });
  let pos = existing.length;
  await db.insert(flashcards).values(cleaned.map((c) => ({
    deckId: input.deckId,
    front: c.front,
    back: c.back,
    hint: c.hint,
    position: pos++,
    createdAt: new Date(),
  })));

  revalidatePath(`/klassen/${deck.classId}/karteikarten`);
  return cleaned.length;
}

/**
 * Einsteigerpfad: Lehrkraft akzeptiert vorgeschlagene Karten direkt nach Task-Erstellung.
 * Erstellt (falls noch nicht vorhanden) einen Auto-Deck für die Aufgabe und fügt Karten hinzu.
 */
export async function acceptAutoCards(input: {
  classId: string;
  topicId?: string | null;
  taskId?: string | null;
  deckName: string;
  cards: { front: string; back: string; hint?: string | null }[];
}) {
  const teacher = await requireTeacher();
  if (!(await canManageClass(teacher.id, input.classId))) throw new Error("Keine Berechtigung");

  // Vorhandenen Auto-Deck für diese Aufgabe finden
  let deckId: string | null = null;
  if (input.taskId) {
    const existing = await db.query.flashcardDecks.findFirst({
      where: and(eq(flashcardDecks.classId, input.classId), eq(flashcardDecks.sourceTaskId, input.taskId)),
    });
    deckId = existing?.id ?? null;
  }
  if (!deckId) {
    deckId = await createDeck({
      classId: input.classId,
      topicId: input.topicId ?? null,
      name: input.deckName,
      source: input.taskId ? "auto_task" : "auto_content",
      sourceTaskId: input.taskId ?? null,
    });
  }
  return await addCardsToDeck({ deckId, cards: input.cards });
}

export async function deleteCard(cardId: string) {
  const teacher = await requireTeacher();
  const card = await db.query.flashcards.findFirst({ where: eq(flashcards.id, cardId) });
  if (!card) throw new Error("Karte nicht gefunden");
  const deck = await db.query.flashcardDecks.findFirst({ where: eq(flashcardDecks.id, card.deckId) });
  if (!deck) throw new Error("Stapel nicht gefunden");
  if (!(await canManageClass(teacher.id, deck.classId))) throw new Error("Keine Berechtigung");
  await db.delete(flashcards).where(eq(flashcards.id, cardId));
  revalidatePath(`/klassen/${deck.classId}/karteikarten`);
}

// ===== Schüler: Karten lernen =====

/**
 * Holt fällige Karten für den Schüler (über alle seine Klassen-Decks).
 * Neue Karten (ohne Review-Eintrag) gelten als heute fällig.
 */
export async function getDueCards(limit: number = 20) {
  const student = await requireStudent();

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, student.id),
  });
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) return [];

  const decks = await db.query.flashcardDecks.findMany({
    where: inArray(flashcardDecks.classId, classIds),
  });
  const deckIds = decks.map((d) => d.id);
  if (deckIds.length === 0) return [];

  const allCards = await db.query.flashcards.findMany({
    where: inArray(flashcards.deckId, deckIds),
  });
  if (allCards.length === 0) return [];

  const cardIds = allCards.map((c) => c.id);
  const reviews = await db.query.cardReviews.findMany({
    where: and(eq(cardReviews.userId, student.id), inArray(cardReviews.cardId, cardIds)),
  });
  const reviewMap = Object.fromEntries(reviews.map((r) => [r.cardId, r]));

  const now = new Date();
  const dueCards = allCards
    .filter((c) => {
      const r = reviewMap[c.id];
      if (!r) return true; // neue Karte → heute fällig
      return new Date(r.dueAt) <= now;
    })
    .map((c) => ({
      ...c,
      deckName: decks.find((d) => d.id === c.deckId)?.name ?? "—",
      classId: decks.find((d) => d.id === c.deckId)?.classId,
      review: reviewMap[c.id] ?? null,
    }))
    .slice(0, limit);

  return dueCards;
}

export async function reviewCard(input: { cardId: string; rating: Rating }) {
  const student = await requireStudent();

  // Aktueller State (oder default)
  const existing = await db.query.cardReviews.findFirst({
    where: and(eq(cardReviews.cardId, input.cardId), eq(cardReviews.userId, student.id)),
  });
  const state = existing
    ? { ease: existing.ease, interval: existing.interval, repetitions: existing.repetitions, lapses: existing.lapses }
    : { ease: 2.5, interval: 0, repetitions: 0, lapses: 0 };

  const next = scheduleNext(state, input.rating);

  if (existing) {
    await db.update(cardReviews).set({
      ease: next.ease,
      interval: next.interval,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    }).where(and(eq(cardReviews.cardId, input.cardId), eq(cardReviews.userId, student.id)));
  } else {
    await db.insert(cardReviews).values({
      cardId: input.cardId,
      userId: student.id,
      ease: next.ease,
      interval: next.interval,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    });
  }

  revalidatePath("/sus/karteikarten");
  return next;
}
