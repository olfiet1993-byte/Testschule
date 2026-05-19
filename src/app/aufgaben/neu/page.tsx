import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classes, contentItems, topics, curriculumUnits } from "@/db/schema";
import { asc, eq, inArray, or, isNull } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { NewTaskPicker } from "./NewTaskPicker";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const { type } = await searchParams;

  const myClasses = await db.query.classes.findMany({
    where: eq(classes.teacherId, session.user.id),
  });

  const libraryItems = await db.query.contentItems.findMany({
    where: eq(contentItems.schoolId, session.user.schoolId),
  });

  const allTopics = myClasses.length
    ? await db.query.topics.findMany({
        where: inArray(topics.classId, myClasses.map((c) => c.id)),
        orderBy: [asc(topics.position)],
      })
    : [];

  const curriculum = await db.query.curriculumUnits.findMany({
    where: or(isNull(curriculumUnits.schoolId), eq(curriculumUnits.schoolId, session.user.schoolId)),
    orderBy: [asc(curriculumUnits.position)],
  });

  return (
    <AppShell>
      <NewTaskPicker
        type={type ?? null}
        classes={JSON.parse(JSON.stringify(myClasses))}
        library={JSON.parse(JSON.stringify(libraryItems))}
        topics={JSON.parse(JSON.stringify(allTopics))}
        curriculum={JSON.parse(JSON.stringify(curriculum))}
      />
    </AppShell>
  );
}
