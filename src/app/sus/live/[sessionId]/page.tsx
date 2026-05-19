import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PlayerView } from "./PlayerView";
import { getSession, buildPublicState, joinSession } from "@/lib/live/sessions";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PlayerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "student") redirect("/login");

  const live = getSession(sessionId);
  if (!live) notFound();

  // Avatar-Daten holen damit sie in der Lobby angezeigt werden
  const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  joinSession(sessionId, session.user.id, session.user.displayName, me?.avatarEmoji, me?.avatarColor);

  const initialState = buildPublicState(live);

  return (
    <AppShell>
      <PlayerView
        initialState={initialState}
        sessionId={sessionId}
        myUserId={session.user.id}
      />
    </AppShell>
  );
}
