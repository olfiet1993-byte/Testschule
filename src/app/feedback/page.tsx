import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { feedback, feedbackVotes, users } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { FeedbackBoard } from "./FeedbackBoard";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await db.query.feedback.findMany({
    orderBy: [desc(feedback.createdAt)],
  });

  // Voting Counts + ob aktueller User dafür gevotet hat
  const fbIds = items.map((f) => f.id);
  const allVotes = fbIds.length
    ? await db.query.feedbackVotes.findMany({ where: inArray(feedbackVotes.feedbackId, fbIds) })
    : [];
  const voteCount: Record<string, number> = {};
  const myVotes = new Set<string>();
  for (const v of allVotes) {
    voteCount[v.feedbackId] = (voteCount[v.feedbackId] ?? 0) + 1;
    if (v.userId === session.user.id) myVotes.add(v.feedbackId);
  }

  // Author display names
  const userIds = Array.from(new Set([
    ...items.map((f) => f.userId),
    ...items.map((f) => f.respondedBy).filter(Boolean) as string[],
  ]));
  const userMap = userIds.length
    ? Object.fromEntries(
        (await db.query.users.findMany({ where: inArray(users.id, userIds) }))
          .map((u) => [u.id, { displayName: u.displayName, avatarEmoji: u.avatarEmoji, avatarColor: u.avatarColor, role: u.role }]),
      )
    : {};

  return (
    <AppShell>
      <FeedbackBoard
        items={JSON.parse(JSON.stringify(items))}
        voteCount={voteCount}
        myVotes={Array.from(myVotes)}
        userMap={userMap}
        myUserId={session.user.id}
        myRole={session.user.role}
      />
    </AppShell>
  );
}
