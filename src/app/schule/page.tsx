import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { schools, users, teacherInvites, classes } from "@/db/schema";
import { eq, isNull, and, count } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { Card, Badge } from "@/components/ui/Input";
import { Avatar } from "@/components/Avatar";
import { SchuleClient } from "./SchuleClient";
import { GraduationCap, Users as UsersIcon, Mail, Check, AlertCircle, History, Database } from "lucide-react";
import { isMailEnabled } from "@/lib/mail";
import { listBackups } from "@/lib/actions/backup";
import Link from "next/link";
import { BackupClient } from "./BackupClient";

export default async function SchulePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") redirect("/login");

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, session.user.schoolId),
  });
  if (!school) redirect("/login");

  const teachers = await db.query.users.findMany({
    where: and(eq(users.schoolId, school.id), eq(users.role, "teacher")),
  });

  const pendingInvites = await db.query.teacherInvites.findMany({
    where: and(eq(teacherInvites.schoolId, school.id), isNull(teacherInvites.acceptedAt)),
  });

  // Anzahl Klassen pro Lehrer
  const classCounts = await Promise.all(
    teachers.map(async (t) => {
      const [r] = await db.select({ v: count() }).from(classes).where(eq(classes.teacherId, t.id));
      return [t.id, r.v] as const;
    })
  );
  const classCountById = Object.fromEntries(classCounts);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-sky-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{school.name}</h1>
          <p className="text-sm text-slate-500">
            {teachers.length} Lehrkraft{teachers.length === 1 ? "" : "/" + teachers.length + " Lehrkräfte"} · {pendingInvites.length} offene Einladung{pendingInvites.length === 1 ? "" : "en"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <UsersIcon className="w-4 h-4" /> Kollegium
          </h2>
          <ul className="space-y-2">
            {teachers.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <Avatar user={t} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {t.displayName}
                    {t.id === session.user.id && (
                      <Badge className="ml-2 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">du</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {t.email} · {classCountById[t.id] ?? 0} Klassen
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <SchuleClient
          schoolName={school.name}
          invites={JSON.parse(JSON.stringify(pendingInvites))}
          baseUrl={process.env.AUTH_URL ?? "http://localhost:3000"}
          mailEnabled={isMailEnabled()}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Aktivitäts-Protokoll
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            Wer hat wann was geändert — Aufgaben, Klassen, Einladungen, Backups.
          </p>
          <Link href="/audit" className="text-sm text-sky-600 hover:underline">
            Protokoll ansehen →
          </Link>
        </Card>

        <BackupClient backups={JSON.parse(JSON.stringify(await listBackups()))} />
      </div>
    </AppShell>
  );
}
