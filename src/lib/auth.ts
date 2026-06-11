import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, classes, classMembers } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "teacher" | "student" | "admin";
      schoolId: string;
      displayName: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "teacher",
      name: "Lehrer-Login",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await db.query.users.findFirst({
          where: and(eq(users.email, email), inArray(users.role, ["teacher", "admin"])),
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.displayName,
          email: user.email!,
          role: user.role,
          schoolId: user.schoolId,
          displayName: user.displayName,
        } as any;
      },
    }),
    Credentials({
      id: "student",
      name: "Schüler-Login",
      credentials: {
        inviteCode: { label: "Klassen-Code", type: "text" },
        displayName: { label: "Dein Name", type: "text" },
        pin: { label: "PIN", type: "password" },
        newPin: { label: "Neuer PIN", type: "password" },
      },
      async authorize(creds) {
        const code = String(creds?.inviteCode ?? "").toUpperCase().trim();
        const displayName = String(creds?.displayName ?? "").trim();
        const pin = String(creds?.pin ?? "").trim();
        const newPin = String(creds?.newPin ?? "").trim();
        if (!code || !displayName) return null;

        const klass = await db.query.classes.findFirst({
          where: eq(classes.inviteCode, code),
        });
        if (!klass) return null;

        let user = await db.query.users.findFirst({
          where: and(
            eq(users.displayName, displayName),
            eq(users.schoolId, klass.schoolId),
            eq(users.role, "student"),
          ),
        });

        if (!user) {
          // Erstanlage: newPin erforderlich
          if (!newPin || newPin.length < 4) return null;
          const pinHash = await bcrypt.hash(newPin, 10);
          const inserted = await db
            .insert(users)
            .values({
              schoolId: klass.schoolId,
              role: "student",
              displayName,
              pinHash,
            })
            .returning();
          user = inserted[0];
          await db.insert(classMembers).values({ classId: klass.id, userId: user.id });
        } else {
          // Existierender User
          if (user.pinHash) {
            // PIN gesetzt → PIN erforderlich
            if (!pin) return null;
            const ok = await bcrypt.compare(pin, user.pinHash);
            if (!ok) return null;
          } else {
            // Kein PIN gesetzt → newPin erforderlich für Erstanmeldung
            if (!newPin || newPin.length < 4) return null;
            const pinHash = await bcrypt.hash(newPin, 10);
            await db.update(users).set({ pinHash }).where(eq(users.id, user.id));
          }
          // Sicherstellen dass User Mitglied in der Klasse ist
          const existing = await db.query.classMembers.findFirst({
            where: and(eq(classMembers.classId, klass.id), eq(classMembers.userId, user.id)),
          });
          if (!existing) {
            await db.insert(classMembers).values({ classId: klass.id, userId: user.id });
          }
        }

        return {
          id: user.id,
          name: user.displayName,
          role: user.role,
          schoolId: user.schoolId,
          displayName: user.displayName,
        } as any;
      },
    }),
  ],
});
