"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teacherInvites, users, schools } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sendMail, inviteEmail } from "@/lib/mail";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

const TOKEN_TTL_DAYS = 14;

export async function inviteTeacher(formData: FormData) {
  const me = await teacher();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) throw new Error("Gültige E-Mail erforderlich");

  // Schon Mitglied?
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.schoolId, me.schoolId)),
  });
  if (existing) throw new Error("Lehrkraft ist schon Teil dieser Schule");

  const token = nanoid(24);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(teacherInvites).values({
    schoolId: me.schoolId,
    invitedByUserId: me.id,
    email,
    token,
    expiresAt,
  });

  // Mail-Versand (Resend wenn konfiguriert, sonst Dev-Log)
  try {
    const school = await db.query.schools.findFirst({ where: eq(schools.id, me.schoolId) });
    const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/einladung?token=${token}`;
    const mail = inviteEmail({
      schoolName: school?.name ?? "Test Schule",
      inviterName: me.displayName,
      inviteUrl,
      expiresAt,
    });
    await sendMail({ to: email, subject: mail.subject, html: mail.html });
  } catch (e) {
    console.error("Mail-Versand fehlgeschlagen:", e);
    // Einladung bleibt bestehen — Link kann manuell kopiert werden
  }

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    schoolId: me.schoolId, actorId: me.id, actorName: me.displayName,
    action: "invite.send", entityType: "teacher_invite", entityId: token,
    summary: `Lehrkraft-Einladung an ${email} gesendet`,
  });

  revalidatePath("/schule");
}

export async function revokeInvite(inviteId: string) {
  const me = await teacher();
  await db.delete(teacherInvites).where(
    and(eq(teacherInvites.id, inviteId), eq(teacherInvites.schoolId, me.schoolId)),
  );
  revalidatePath("/schule");
}

export async function acceptInvite(input: { token: string; displayName: string; password: string }) {
  const token = input.token.trim();
  if (!token) throw new Error("Token fehlt");
  const invite = await db.query.teacherInvites.findFirst({
    where: eq(teacherInvites.token, token),
  });
  if (!invite) throw new Error("Einladung nicht gefunden");
  if (invite.acceptedAt) throw new Error("Einladung wurde schon angenommen");
  if (new Date(invite.expiresAt) < new Date()) throw new Error("Einladung abgelaufen");

  const name = input.displayName.trim();
  const password = input.password;
  if (!name) throw new Error("Name fehlt");
  if (password.length < 6) throw new Error("Passwort muss ≥ 6 Zeichen haben");

  // Verhindere Doppel-Account mit derselben Mail in dieser Schule
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, invite.email), eq(users.schoolId, invite.schoolId)),
  });
  if (existing) throw new Error("E-Mail-Adresse ist bereits vergeben");

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    schoolId: invite.schoolId,
    role: "teacher",
    email: invite.email,
    passwordHash,
    displayName: name,
  });
  await db.update(teacherInvites).set({ acceptedAt: new Date() }).where(eq(teacherInvites.id, invite.id));
}
