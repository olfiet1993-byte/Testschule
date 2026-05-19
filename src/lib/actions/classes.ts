"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { classes, yearGroups, groups, groupMembers, classMembers, users } from "@/db/schema";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray } from "drizzle-orm";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

export async function createClass(formData: FormData) {
  const me = await teacher();
  const name = String(formData.get("name") ?? "").trim();
  const yearGroupId = String(formData.get("yearGroupId") ?? "");
  const color = String(formData.get("color") ?? "#0ea5e9");
  if (!name) throw new Error("Name fehlt");

  const [c] = await db.insert(classes).values({
    schoolId: me.schoolId,
    teacherId: me.id,
    yearGroupId: yearGroupId || null,
    name,
    inviteCode: generateInviteCode(),
    color,
  }).returning();

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: "class.create", entityType: "class", entityId: c.id,
    summary: `Klasse "${name}" erstellt`,
  });

  revalidatePath("/klassen");
  revalidatePath("/dashboard");
  redirect(`/klassen/${c.id}`);
}

export async function regenerateInviteCode(classId: string) {
  await teacher();
  await db.update(classes)
    .set({ inviteCode: generateInviteCode() })
    .where(eq(classes.id, classId));
  revalidatePath(`/klassen/${classId}`);
}

export async function deleteClass(classId: string) {
  const me = await teacher();
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
  await db.delete(classes).where(eq(classes.id, classId));
  if (klass) {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
      action: "class.delete", entityType: "class", entityId: classId,
      summary: `Klasse "${klass.name}" gelöscht`,
    });
  }
  revalidatePath("/klassen");
  revalidatePath("/dashboard");
  redirect("/klassen");
}

export async function addStudentManually(classId: string, displayName: string) {
  const me = await teacher();
  const name = displayName.trim();
  if (!name) throw new Error("Name fehlt");

  let user = await db.query.users.findFirst({
    where: and(eq(users.displayName, name), eq(users.schoolId, me.schoolId), eq(users.role, "student")),
  });
  if (!user) {
    const [u] = await db.insert(users).values({
      schoolId: me.schoolId,
      role: "student",
      displayName: name,
    }).returning();
    user = u;
  }
  const existing = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, user.id)),
  });
  if (!existing) {
    await db.insert(classMembers).values({ classId, userId: user.id });
    const { logAudit } = await import("@/lib/audit");
    const klass = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
    await logAudit({
      schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
      action: "member.add", entityType: "class", entityId: classId,
      summary: `Schüler "${name}" zu Klasse "${klass?.name ?? classId}" hinzugefügt`,
    });
  }
  revalidatePath(`/klassen/${classId}`);
}

export async function bulkAddStudents(classId: string, names: string[]) {
  const me = await teacher();
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
  if (!klass) throw new Error("Klasse nicht gefunden");

  const { canManageClass } = await import("@/lib/permissions");
  if (!(await canManageClass(me.id, classId))) throw new Error("Nicht erlaubt");

  const cleaned = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  let added = 0;
  let skipped = 0;

  for (const name of cleaned) {
    let user = await db.query.users.findFirst({
      where: and(eq(users.displayName, name), eq(users.schoolId, me.schoolId), eq(users.role, "student")),
    });
    if (!user) {
      const [u] = await db.insert(users).values({
        schoolId: me.schoolId,
        role: "student",
        displayName: name,
      }).returning();
      user = u;
    }
    const existing = await db.query.classMembers.findFirst({
      where: and(eq(classMembers.classId, classId), eq(classMembers.userId, user.id)),
    });
    if (existing) {
      skipped++;
    } else {
      await db.insert(classMembers).values({ classId, userId: user.id });
      added++;
    }
  }

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: "member.add", entityType: "class", entityId: classId,
    summary: `${added} Schüler:innen importiert in "${klass.name}"${skipped ? ` (${skipped} schon vorhanden)` : ""}`,
  });

  revalidatePath(`/klassen/${classId}`);
  return { added, skipped };
}

export async function removeStudent(classId: string, userId: string) {
  const me = await teacher();
  const student = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const klass = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
  await db.delete(classMembers).where(
    and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))
  );
  if (student && klass) {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
      action: "member.remove", entityType: "class", entityId: classId,
      summary: `Schüler "${student.displayName}" aus "${klass.name}" entfernt`,
    });
  }
  revalidatePath(`/klassen/${classId}`);
}

export async function createGroupsForClass(
  classId: string,
  opts: { groupSize: number; mode: "random" | "manual"; reset?: boolean },
) {
  await teacher();

  if (opts.reset) {
    const existing = await db.query.groups.findMany({ where: eq(groups.classId, classId) });
    if (existing.length > 0) {
      await db.delete(groups).where(eq(groups.classId, classId));
    }
  }

  const members = await db.query.classMembers.findMany({
    where: eq(classMembers.classId, classId),
    with: { user: undefined } as any,
  });
  const memberIds = members.map((m) => m.userId);

  let order = memberIds;
  if (opts.mode === "random") {
    order = [...memberIds];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  const palette = ["#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16"];
  let groupIdx = 0;
  let currentGroup: any = null;
  let groupCounter = 1;

  for (let i = 0; i < order.length; i++) {
    if (!currentGroup || (currentGroup.count >= opts.groupSize)) {
      const [g] = await db.insert(groups).values({
        classId,
        name: `Team ${groupCounter++}`,
        color: palette[groupIdx % palette.length],
      }).returning();
      currentGroup = { id: g.id, count: 0 };
      groupIdx++;
    }
    await db.insert(groupMembers).values({ groupId: currentGroup.id, userId: order[i] });
    currentGroup.count++;
  }

  revalidatePath(`/klassen/${classId}`);
}

export async function deleteGroup(groupId: string, classId: string) {
  await teacher();
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath(`/klassen/${classId}`);
}

export async function moveStudentToGroup(
  classId: string,
  userId: string,
  targetGroupId: string | null,
) {
  await teacher();
  const classGroups = await db.query.groups.findMany({ where: eq(groups.classId, classId) });
  const ids = classGroups.map((g) => g.id);
  if (ids.length > 0) {
    await db.delete(groupMembers).where(
      and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, ids))
    );
  }
  if (targetGroupId) {
    await db.insert(groupMembers).values({ groupId: targetGroupId, userId });
  }
  revalidatePath(`/klassen/${classId}`);
}
