"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { studentNotes, users, classMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

/** Prüfen, dass Lehrer Zugriff auf den Schüler hat (gemeinsame Klasse) */
async function ensureCanAccessStudent(teacherId: string, studentId: string) {
  const { manageableClassIds } = await import("@/lib/permissions");
  const myClassIds = await manageableClassIds(teacherId);
  if (myClassIds.length === 0) throw new Error("Keine Klassen");
  const rows = await db.query.classMembers.findMany({ where: eq(classMembers.userId, studentId) });
  if (!rows.some((r) => myClassIds.includes(r.classId))) {
    throw new Error("Kein Zugriff auf diesen Schüler");
  }
}

export async function addStudentNote(input: { studentId: string; body: string }) {
  const me = await teacher();
  const text = input.body.trim();
  if (!text) throw new Error("Notiz darf nicht leer sein");
  await ensureCanAccessStudent(me.id, input.studentId);

  await db.insert(studentNotes).values({
    studentId: input.studentId,
    authorId: me.id,
    body: text,
    updatedAt: new Date(),
  });
  revalidatePath(`/klassen`);
}

export async function updateStudentNote(input: { noteId: string; body: string }) {
  const me = await teacher();
  const note = await db.query.studentNotes.findFirst({ where: eq(studentNotes.id, input.noteId) });
  if (!note) throw new Error("Notiz nicht gefunden");
  if (note.authorId !== me.id) throw new Error("Du kannst nur deine eigenen Notizen ändern");
  const text = input.body.trim();
  if (!text) throw new Error("Notiz darf nicht leer sein");
  await db.update(studentNotes)
    .set({ body: text, updatedAt: new Date() })
    .where(eq(studentNotes.id, input.noteId));
  revalidatePath(`/klassen`);
}

export async function deleteStudentNote(noteId: string) {
  const me = await teacher();
  const note = await db.query.studentNotes.findFirst({ where: eq(studentNotes.id, noteId) });
  if (!note) return;
  if (note.authorId !== me.id) throw new Error("Du kannst nur deine eigenen Notizen löschen");
  await db.delete(studentNotes).where(eq(studentNotes.id, noteId));
  revalidatePath(`/klassen`);
}
