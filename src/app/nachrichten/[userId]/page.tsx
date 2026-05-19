import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { and, eq, or, asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { markConversationRead } from "@/lib/actions/messages";
import { ConversationClient } from "./ConversationClient";

export default async function Conversation({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const meId = session.user.id;

  const other = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!other) notFound();
  if (other.schoolId !== session.user.schoolId) notFound();

  // Konversation laden
  const conv = await db
    .select()
    .from(messages)
    .where(or(
      and(eq(messages.senderId, meId), eq(messages.recipientId, userId)),
      and(eq(messages.senderId, userId), eq(messages.recipientId, meId)),
    ))
    .orderBy(asc(messages.createdAt));

  // Mark als gelesen
  await markConversationRead(userId);

  return (
    <AppShell>
      <ConversationClient
        me={{ id: meId, displayName: session.user.displayName }}
        other={JSON.parse(JSON.stringify(other))}
        messages={JSON.parse(JSON.stringify(conv))}
      />
    </AppShell>
  );
}
