import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users, classMembers, submissions, messages, questions, answers, notifications,
} from "@/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * DSGVO Art. 20: Recht auf Datenübertragbarkeit.
 * Liefert alle personenbezogenen Daten des angemeldeten Users als JSON.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = session.user.id;

  const [
    user,
    memberships,
    mySubs,
    myMessages,
    myQuestions,
    myAnswers,
    myNotifications,
  ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, me) }),
    db.query.classMembers.findMany({ where: eq(classMembers.userId, me) }),
    db.query.submissions.findMany({ where: eq(submissions.userId, me) }),
    db.query.messages.findMany({
      where: or(eq(messages.senderId, me), eq(messages.recipientId, me)),
    }),
    db.query.questions.findMany({ where: eq(questions.authorId, me) }),
    db.query.answers.findMany({ where: eq(answers.authorId, me) }),
    db.query.notifications.findMany({ where: eq(notifications.userId, me) }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          role: user.role,
          email: user.email,
          displayName: user.displayName,
          avatarEmoji: user.avatarEmoji,
          avatarColor: user.avatarColor,
          xp: user.xp,
          level: user.level,
          streakDays: user.streakDays,
          lastActiveAt: user.lastActiveAt,
          createdAt: user.createdAt,
        }
      : null,
    classMemberships: memberships,
    submissions: mySubs,
    messages: myMessages,
    questions: myQuestions,
    answers: myAnswers,
    notifications: myNotifications,
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `meine-daten-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
