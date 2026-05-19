import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSession, joinSession, submitAnswer, startQuestion, nextQuestion, endNow,
} from "@/lib/live/sessions";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const live = getSession(sessionId);
  if (!live) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const me = session.user;

  switch (action) {
    case "join": {
      if (me.role !== "student") return NextResponse.json({ error: "students only" }, { status: 403 });
      const user = await db.query.users.findFirst({ where: eq(users.id, me.id) });
      joinSession(sessionId, me.id, me.displayName, user?.avatarEmoji, user?.avatarColor);
      return NextResponse.json({ ok: true });
    }
    case "answer": {
      if (me.role !== "student") return NextResponse.json({ error: "students only" }, { status: 403 });
      const optionIdx = Number(body.optionIdx);
      if (Number.isNaN(optionIdx)) return NextResponse.json({ error: "bad option" }, { status: 400 });
      const r = submitAnswer(sessionId, me.id, optionIdx);
      return NextResponse.json(r);
    }
    case "start_question": {
      if (me.role !== "teacher") return NextResponse.json({ error: "teachers only" }, { status: 403 });
      const ok = startQuestion(sessionId, me.id);
      return NextResponse.json({ ok });
    }
    case "next_question": {
      if (me.role !== "teacher") return NextResponse.json({ error: "teachers only" }, { status: 403 });
      const ok = nextQuestion(sessionId, me.id);
      return NextResponse.json({ ok });
    }
    case "end": {
      if (me.role !== "teacher") return NextResponse.json({ error: "teachers only" }, { status: 403 });
      const ok = endNow(sessionId, me.id);
      return NextResponse.json({ ok });
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
