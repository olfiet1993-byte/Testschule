import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, classMembers, groups, groupMembers, users, topics, tasks, classTeachers } from "@/db/schema";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Input, Label, Badge } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ClassDetailClient } from "./ClassDetailClient";

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
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
  const isOwner = klass.teacherId === session.user.id;

  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarEmoji: users.avatarEmoji,
      avatarColor: users.avatarColor,
      xp: users.xp,
      level: users.level,
      streakDays: users.streakDays,
      joinedAt: classMembers.joinedAt,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.userId, users.id))
    .where(eq(classMembers.classId, id));

  const classGroups = await db.query.groups.findMany({ where: eq(groups.classId, id) });
  const groupMembs = classGroups.length
    ? await db.query.groupMembers.findMany({
        where: inArray(groupMembers.groupId, classGroups.map((g) => g.id)),
      })
    : [];

  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: [asc(topics.position), asc(topics.createdAt)],
  });

  // Co-Lehrer
  const coTeacherRows = await db.query.classTeachers.findMany({
    where: eq(classTeachers.classId, id),
  });
  const coTeacherIds = coTeacherRows.map((r) => r.userId);
  const coTeacherUsers = coTeacherIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, coTeacherIds) })
    : [];

  // Verfügbare Kollegen für Co-Lehrer (Lehrer derselben Schule, nicht Owner, nicht schon Co)
  const availableTeachers = await db.query.users.findMany({
    where: and(
      eq(users.schoolId, session.user.schoolId),
      eq(users.role, "teacher"),
      ne(users.id, klass.teacherId),
    ),
  });
  const availableForAdd = availableTeachers.filter((u) => !coTeacherIds.includes(u.id));

  const owner = await db.query.users.findFirst({ where: eq(users.id, klass.teacherId) });

  // Wie viele Aufgaben pro Thema?
  const classTasks = await db.query.tasks.findMany({ where: eq(tasks.classId, id) });
  const taskCountByTopic: Record<string, number> = {};
  let unassigned = 0;
  for (const t of classTasks) {
    if (t.topicId) taskCountByTopic[t.topicId] = (taskCountByTopic[t.topicId] ?? 0) + 1;
    else unassigned++;
  }

  return (
    <AppShell>
      <ClassDetailClient
        klass={JSON.parse(JSON.stringify(klass))}
        members={JSON.parse(JSON.stringify(members))}
        groups={JSON.parse(JSON.stringify(classGroups))}
        groupMembers={JSON.parse(JSON.stringify(groupMembs))}
        topics={JSON.parse(JSON.stringify(classTopics))}
        taskCountByTopic={taskCountByTopic}
        unassignedTaskCount={unassigned}
        isOwner={isOwner}
        owner={JSON.parse(JSON.stringify(owner))}
        coTeachers={JSON.parse(JSON.stringify(coTeacherUsers))}
        availableTeachers={JSON.parse(JSON.stringify(availableForAdd))}
      />
    </AppShell>
  );
}
