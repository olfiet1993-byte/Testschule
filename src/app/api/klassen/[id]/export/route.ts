import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions } from "@/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const klass = await db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.teacherId, session.user.id)),
  });
  if (!klass) return NextResponse.json({ error: "not found" }, { status: 404 });

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      xp: users.xp,
      level: users.level,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.userId, users.id))
    .where(eq(classMembers.classId, id))
    .orderBy(asc(users.displayName));

  const classTasks = await db.query.tasks.findMany({
    where: eq(tasks.classId, id),
    orderBy: [asc(tasks.createdAt)],
  });

  const allSubs = classTasks.length && members.length
    ? await db.query.submissions.findMany({
        where: and(
          inArray(submissions.taskId, classTasks.map((t) => t.id)),
          inArray(submissions.userId, members.map((m) => m.id)),
        ),
      })
    : [];

  // CSV bauen — Semikolon (DE-Excel-freundlich), CRLF
  function escape(s: string | number | null | undefined): string {
    const str = s == null ? "" : String(s);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headers = ["Schueler", "Level", "XP", ...classTasks.map((t) => t.title), "Ø Score (%)"];
  const lines: string[] = [headers.map(escape).join(";")];

  for (const m of members) {
    const row: (string | number)[] = [m.displayName, m.level, m.xp];
    const scores: number[] = [];
    for (const t of classTasks) {
      const s = allSubs.find((x) => x.userId === m.id && x.taskId === t.id);
      if (s?.scorePct != null) {
        row.push(Math.round(s.scorePct));
        scores.push(s.scorePct);
      } else {
        row.push("");
      }
    }
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "";
    row.push(avg);
    lines.push(row.map(escape).join(";"));
  }

  // BOM für Excel
  const csv = "﻿" + lines.join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Notenliste_${klass.name}_${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
