import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { classes, scheduleSlots, topics } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { StundenplanClient } from "./StundenplanClient";

export default async function StundenplanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const klass = await db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.teacherId, session.user.id)),
  });
  if (!klass) notFound();

  const slots = await db.query.scheduleSlots.findMany({
    where: eq(scheduleSlots.classId, id),
    orderBy: [asc(scheduleSlots.weekday), asc(scheduleSlots.startTime)],
  });
  const classTopics = await db.query.topics.findMany({
    where: eq(topics.classId, id),
    orderBy: [asc(topics.position)],
  });

  return (
    <AppShell>
      <StundenplanClient
        klass={JSON.parse(JSON.stringify(klass))}
        slots={JSON.parse(JSON.stringify(slots))}
        topics={JSON.parse(JSON.stringify(classTopics))}
      />
    </AppShell>
  );
}
