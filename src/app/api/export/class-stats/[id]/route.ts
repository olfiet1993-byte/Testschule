import { auth } from "@/lib/auth";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions, topics } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { classStatsToXlsx } from "@/lib/exports/classStatsToXlsx";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/export/class-stats/[id]
 * Erzeugt eine Excel-Datei mit Notenliste + Themen-Mastery + Aufgaben-Statistik.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!(await canManageClass(session.user.id, id))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, id) });
  if (!klass) return NextResponse.json({ error: "Klasse nicht gefunden" }, { status: 404 });

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      xp: users.xp,
      level: users.level,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.userId, users.id))
    .where(eq(classMembers.classId, id));

  const allTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: (t, { asc }) => [asc(t.title)],
  });

  const subs =
    allTasks.length && members.length
      ? await db.query.submissions.findMany({
          where: and(
            inArray(submissions.taskId, allTasks.map((t) => t.id)),
            inArray(submissions.userId, members.map((m) => m.id)),
          ),
        })
      : [];

  const buf = await classStatsToXlsx({
    className: klass.name,
    members,
    tasks: allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      topicId: t.topicId,
      difficulty: t.difficulty,
    })),
    topics: classTopics.map((t) => ({ id: t.id, title: t.title })),
    scores: subs.map((s) => ({
      userId: s.userId,
      taskId: s.taskId,
      scorePct: s.scorePct,
    })),
  });

  const safeName = klass.name.replace(/[^\w\-äöüÄÖÜß ]/g, "_");
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Statistik_${safeName}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
