import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tasks, classes, curriculumUnits, users, classMembers, classTeachers } from "@/db/schema";
import { and, asc, eq, inArray, isNull, or, desc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { AustauschBoard } from "./AustauschBoard";

export default async function AustauschPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");
  const schoolId = session.user.schoolId;

  // Curriculum (global + eigene Schule)
  const curriculum = await db.query.curriculumUnits.findMany({
    where: or(isNull(curriculumUnits.schoolId), eq(curriculumUnits.schoolId, schoolId)),
    orderBy: [asc(curriculumUnits.position)],
  });

  // Alle Klassen meiner Schule (für Ziel-Klassen + Autor-Mapping)
  const schoolClasses = await db.query.classes.findMany({
    where: eq(classes.schoolId, schoolId),
  });
  const schoolClassIds = schoolClasses.map((c) => c.id);

  // Geteilte Aufgaben in der ganzen Schule
  const sharedTasks = schoolClassIds.length
    ? await db.query.tasks.findMany({
        where: and(inArray(tasks.classId, schoolClassIds), eq(tasks.sharedInSchool, true)),
        orderBy: [desc(tasks.createdAt)],
      })
    : [];

  // Autor-Mapping
  const authorIds = Array.from(new Set(sharedTasks.map((t) => t.authorId)));
  const authors = authorIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, authorIds) })
    : [];
  const authorMap = Object.fromEntries(authors.map((u) => [u.id, { displayName: u.displayName, avatarEmoji: u.avatarEmoji, avatarColor: u.avatarColor }]));
  const classMap = Object.fromEntries(schoolClasses.map((c) => [c.id, c.name]));

  // Meine Klassen (Lehrer + Co-Teacher) — für Klonen
  const ownedClasses = await db.query.classes.findMany({ where: eq(classes.teacherId, session.user.id) });
  const coTeachings = await db.query.classTeachers.findMany({ where: eq(classTeachers.userId, session.user.id) });
  const myClassIds = Array.from(new Set([
    ...ownedClasses.map((c) => c.id),
    ...coTeachings.map((c) => c.classId),
  ]));
  const myClasses = myClassIds.length
    ? await db.query.classes.findMany({ where: inArray(classes.id, myClassIds) })
    : [];

  return (
    <AppShell>
      <AustauschBoard
        curriculum={JSON.parse(JSON.stringify(curriculum))}
        sharedTasks={JSON.parse(JSON.stringify(sharedTasks))}
        authorMap={authorMap}
        classMap={classMap}
        myClasses={JSON.parse(JSON.stringify(myClasses))}
        myUserId={session.user.id}
      />
    </AppShell>
  );
}
