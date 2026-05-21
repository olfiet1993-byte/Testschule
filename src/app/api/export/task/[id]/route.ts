import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, classes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canManageClass } from "@/lib/permissions";
import { taskToDocx } from "@/lib/exports/taskToDocx";
import { caseToPptx } from "@/lib/exports/caseToPptx";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/export/task/[id]?format=docx|pptx&solutions=true|false
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const format = (req.nextUrl.searchParams.get("format") ?? "docx") as "docx" | "pptx";
  const withSolutions = req.nextUrl.searchParams.get("solutions") === "true";

  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404 });
  if (!(await canManageClass(session.user.id, task.classId))) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, task.classId) });
  const safeTitle = task.title.replace(/[^\w\-äöüÄÖÜß ]/g, "_").slice(0, 60);

  if (format === "pptx") {
    if (task.type !== "case_study") {
      return NextResponse.json(
        { error: "PowerPoint-Export nur für Fallstudien verfügbar" },
        { status: 400 },
      );
    }
    const buf = await caseToPptx(task as any, {
      withSolutions,
      className: klass?.name,
    });
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeTitle}.pptx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Default: docx
  const buf = await taskToDocx(task as any, {
    withSolutions,
    className: klass?.name,
  });
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
