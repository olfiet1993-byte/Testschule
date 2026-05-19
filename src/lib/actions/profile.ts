"use server";

import { auth, signOut } from "@/lib/auth";
import { db } from "@/db";
import { users, classes, classMembers } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function setAvatar(input: { emoji?: string | null; color?: string | null }) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  const patch: Record<string, any> = {};
  if (input.emoji !== undefined) patch.avatarEmoji = input.emoji || null;
  if (input.color !== undefined) patch.avatarColor = input.color || null;
  if (Object.keys(patch).length === 0) return;
  await db.update(users).set(patch).where(eq(users.id, session.user.id));
  revalidatePath("/sus");
  revalidatePath("/dashboard");
  revalidatePath("/profil");
}

export async function setDisplayName(name: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  if (session.user.role !== "student") throw new Error("Nur Schüler können den Namen ändern");
  const cleaned = name.trim();
  if (!cleaned) throw new Error("Name darf nicht leer sein");
  await db.update(users).set({ displayName: cleaned }).where(eq(users.id, session.user.id));
  revalidatePath("/sus");
  revalidatePath("/profil");
}

export async function changePin(input: { oldPin: string; newPin: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  if (session.user.role !== "student") throw new Error("Nur Schüler:innen haben eine PIN");
  if (!input.newPin || input.newPin.length < 4) throw new Error("Neue PIN muss mind. 4 Stellen haben");

  const me = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!me) throw new Error("User nicht gefunden");
  if (me.pinHash) {
    const ok = await bcrypt.compare(input.oldPin, me.pinHash);
    if (!ok) throw new Error("Aktuelle PIN falsch");
  }
  const newHash = await bcrypt.hash(input.newPin, 10);
  await db.update(users).set({ pinHash: newHash }).where(eq(users.id, me.id));
  revalidatePath("/profil");
}

export async function resetStudentPin(studentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
  if (!student || student.role !== "student" || student.schoolId !== session.user.schoolId) {
    throw new Error("Schüler:in nicht gefunden");
  }
  // Prüfen, ob der Lehrer eine gemeinsame Klasse mit dem Schüler hat
  const { manageableClassIds } = await import("@/lib/permissions");
  const myClassIds = await manageableClassIds(session.user.id);
  const rows = await db.query.classMembers.findMany({ where: eq(classMembers.userId, studentId) });
  if (!rows.some((r) => myClassIds.includes(r.classId))) {
    throw new Error("Du verwaltest keine Klasse dieses Schülers");
  }
  await db.update(users).set({ pinHash: null }).where(eq(users.id, studentId));
  revalidatePath(`/klassen`);
}

/**
 * DSGVO Art. 17: Recht auf Löschung.
 * Löscht den User und alle abhängigen Daten (per CASCADE).
 * Lehrer können sich nur löschen, wenn sie keine eigenen Klassen mehr haben.
 */
export async function deleteOwnAccount(confirmation: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht autorisiert");
  if (confirmation !== "LÖSCHEN") throw new Error("Bestätigung muss 'LÖSCHEN' lauten");

  if (session.user.role === "teacher") {
    const myClasses = await db.query.classes.findFirst({
      where: eq(classes.teacherId, session.user.id),
    });
    if (myClasses) {
      throw new Error(
        "Du hast noch eigene Klassen. Übergib oder lösche sie zuerst, dann kannst du dein Konto löschen.",
      );
    }
  }

  await db.delete(users).where(eq(users.id, session.user.id));
  // Sign-out + redirect zur Login-Seite
  await signOut({ redirect: false });
  redirect("/login?deleted=1");
}
