import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classes, topics } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const myClasses = await db.query.classes.findMany({
    where: eq(classes.teacherId, session.user.id),
  });
  const allTopics = myClasses.length
    ? await db.query.topics.findMany({
        where: inArray(topics.classId, myClasses.map((c) => c.id)),
        orderBy: [asc(topics.position)],
      })
    : [];

  return (
    <AppShell>
      <ImportClient
        classes={JSON.parse(JSON.stringify(myClasses))}
        topics={JSON.parse(JSON.stringify(allTopics))}
      />
    </AppShell>
  );
}
