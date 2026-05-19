import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, users, tasks, submissions } from "@/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { PrintNoten } from "./PrintNoten";

export default async function PrintNotenliste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const { canManageClass } = await import("@/lib/permissions");
  if (!(await canManageClass(session.user.id, id))) notFound();

  const klass = await db.query.classes.findFirst({
    where: eq(classes.id, id),
    with: { yearGroup: true },
  });
  if (!klass) notFound();

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

  const owner = await db.query.users.findFirst({ where: eq(users.id, klass.teacherId) });

  return (
    <PrintNoten
      klass={JSON.parse(JSON.stringify(klass))}
      members={JSON.parse(JSON.stringify(members))}
      tasks={JSON.parse(JSON.stringify(classTasks))}
      submissions={JSON.parse(JSON.stringify(allSubs))}
      teacherName={owner?.displayName ?? "—"}
    />
  );
}
