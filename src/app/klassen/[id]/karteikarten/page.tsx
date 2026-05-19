import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, flashcardDecks, flashcards, cardReviews, classMembers, tasks } from "@/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlashcardDeckList } from "./FlashcardDeckList";

export default async function KarteikartenOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  const decks = await db.query.flashcardDecks.findMany({
    where: eq(flashcardDecks.classId, id),
    orderBy: [desc(flashcardDecks.createdAt)],
  });

  const deckIds = decks.map((d) => d.id);
  const cards = deckIds.length
    ? await db.query.flashcards.findMany({ where: inArray(flashcards.deckId, deckIds) })
    : [];

  // Tasks-Map (für source-Links)
  const sourceTaskIds = decks.map((d) => d.sourceTaskId).filter(Boolean) as string[];
  const sourceTasks = sourceTaskIds.length
    ? await db.query.tasks.findMany({ where: inArray(tasks.id, sourceTaskIds) })
    : [];
  const taskMap = Object.fromEntries(sourceTasks.map((t) => [t.id, t]));

  // Klassen-Mitglieder, um Lern-Stats je Deck zu rechnen
  const members = await db.query.classMembers.findMany({ where: eq(classMembers.classId, id) });
  const memberIds = members.map((m) => m.userId);

  // Reviews aller Karten der Klasse von allen Mitgliedern
  const cardIds = cards.map((c) => c.id);
  const reviews = cardIds.length && memberIds.length
    ? await db.query.cardReviews.findMany({
        where: and(inArray(cardReviews.cardId, cardIds), inArray(cardReviews.userId, memberIds)),
      })
    : [];

  // Stats je Deck
  const deckStats = decks.map((d) => {
    const dCards = cards.filter((c) => c.deckId === d.id);
    const dCardIds = new Set(dCards.map((c) => c.id));
    const dReviews = reviews.filter((r) => dCardIds.has(r.cardId));
    const learners = new Set(dReviews.map((r) => r.userId)).size;
    const avgEase = dReviews.length
      ? Math.round((dReviews.reduce((a, r) => a + r.ease, 0) / dReviews.length) * 100) / 100
      : null;
    return {
      ...d,
      cardCount: dCards.length,
      learnerCount: learners,
      reviewCount: dReviews.length,
      avgEase,
      sourceTaskTitle: d.sourceTaskId ? taskMap[d.sourceTaskId]?.title ?? null : null,
    };
  });

  return (
    <AppShell>
      <Link href={`/klassen/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zur Klasse
      </Link>
      <FlashcardDeckList
        classId={id}
        className={klass.name}
        decks={JSON.parse(JSON.stringify(deckStats))}
        cards={JSON.parse(JSON.stringify(cards))}
        memberCount={members.length}
      />
    </AppShell>
  );
}
