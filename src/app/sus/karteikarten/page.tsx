import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classMembers, flashcardDecks, flashcards, cardReviews } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Input";
import { Layers } from "lucide-react";
import { KarteikartenTrainer } from "./KarteikartenTrainer";

export default async function KarteikartenPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const memberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, session.user.id),
  });
  const classIds = memberships.map((m) => m.classId);

  let dueCards: any[] = [];
  let totalCards = 0;
  let newCards = 0;
  let reviewedToday = 0;

  if (classIds.length > 0) {
    const decks = await db.query.flashcardDecks.findMany({
      where: inArray(flashcardDecks.classId, classIds),
    });
    const deckIds = decks.map((d) => d.id);
    if (deckIds.length > 0) {
      const allCards = await db.query.flashcards.findMany({
        where: inArray(flashcards.deckId, deckIds),
      });
      totalCards = allCards.length;
      const cardIds = allCards.map((c) => c.id);
      const reviews = cardIds.length
        ? await db.query.cardReviews.findMany({
            where: and(eq(cardReviews.userId, session.user.id), inArray(cardReviews.cardId, cardIds)),
          })
        : [];
      const reviewMap = Object.fromEntries(reviews.map((r) => [r.cardId, r]));

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      reviewedToday = reviews.filter((r) => r.lastReviewedAt && new Date(r.lastReviewedAt) >= todayStart).length;
      newCards = allCards.filter((c) => !reviewMap[c.id]).length;

      dueCards = allCards
        .filter((c) => {
          const r = reviewMap[c.id];
          if (!r) return true;
          return new Date(r.dueAt) <= now;
        })
        .map((c) => {
          const deck = decks.find((d) => d.id === c.deckId);
          return {
            id: c.id,
            front: c.front,
            back: c.back,
            hint: c.hint,
            deckName: deck?.name ?? "—",
          };
        })
        .sort(() => Math.random() - 0.5); // gemischt
    }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Layers className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Karteikarten-Trainer</h1>
          <p className="text-sm text-slate-500">
            Spaced Repetition — wiederholen, was du gerade vergessen würdest.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-violet-600">{dueCards.length}</div>
          <div className="text-xs text-slate-500 mt-1">heute fällig</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{reviewedToday}</div>
          <div className="text-xs text-slate-500 mt-1">heute gelernt</div>
        </Card>
        <Card className="!p-4 text-center">
          <div className="text-3xl font-bold text-slate-600 dark:text-slate-300">{newCards}</div>
          <div className="text-xs text-slate-500 mt-1">noch nie gesehen</div>
        </Card>
      </div>

      {totalCards === 0 ? (
        <Card className="text-center py-12">
          <Layers className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Noch keine Karteikarten in deinen Klassen.</p>
          <p className="text-xs text-slate-400 mt-1">
            Sobald deine Lehrkraft eine Aufgabe erstellt, werden automatisch passende Karten angeboten.
          </p>
        </Card>
      ) : dueCards.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="font-bold mb-1">Alle Karten erledigt!</h2>
          <p className="text-sm text-slate-500">Komm morgen wieder — dann sind neue fällig.</p>
        </Card>
      ) : (
        <KarteikartenTrainer cards={dueCards} />
      )}
    </AppShell>
  );
}
