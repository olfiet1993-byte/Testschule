import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, flashcardDecks, flashcards } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { FlashcardsPrint } from "./FlashcardsPrint";

export default async function KarteikartenPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ deck?: string }>;
}) {
  const { id } = await params;
  const { deck: deckId } = await searchParams;

  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) notFound();

  // Filter: optional auf einen einzigen Deck
  const decks = await db.query.flashcardDecks.findMany({
    where: deckId
      ? eq(flashcardDecks.id, deckId)
      : eq(flashcardDecks.classId, id),
    orderBy: [asc(flashcardDecks.createdAt)],
  });
  const allDeckIds = decks.map((d) => d.id);
  const cards = allDeckIds.length
    ? await db.query.flashcards.findMany({
        where: inArray(flashcards.deckId, allDeckIds),
        orderBy: [asc(flashcards.position)],
      })
    : [];

  // Gruppieren je Deck
  const grouped = decks.map((d) => ({
    deckId: d.id,
    deckName: d.name,
    cards: cards.filter((c) => c.deckId === d.id),
  }));

  return (
    <FlashcardsPrint
      className={klass.name}
      decks={JSON.parse(JSON.stringify(grouped))}
    />
  );
}
