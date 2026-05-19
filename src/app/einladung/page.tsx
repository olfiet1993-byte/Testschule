import { db } from "@/db";
import { teacherInvites, schools, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { EinladungClient } from "./EinladungClient";

export default async function EinladungPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Kein Einladungs-Token</h1>
          <p className="text-sm text-slate-500">
            Diese Seite wird über einen persönlichen Einladungslink aufgerufen.
          </p>
        </div>
      </div>
    );
  }

  const invite = await db.query.teacherInvites.findFirst({ where: eq(teacherInvites.token, token) });
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Einladung ungültig</h1>
          <p className="text-sm text-slate-500">Der Link existiert nicht oder wurde zurückgezogen.</p>
        </div>
      </div>
    );
  }
  if (invite.acceptedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Schon angenommen</h1>
          <p className="text-sm text-slate-500 mb-4">Diese Einladung wurde bereits genutzt.</p>
          <Link href="/login" className="text-sky-600 hover:underline">Zum Login</Link>
        </div>
      </div>
    );
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Einladung abgelaufen</h1>
          <p className="text-sm text-slate-500">Bitte beim Kollegium um eine neue Einladung bitten.</p>
        </div>
      </div>
    );
  }

  const school = await db.query.schools.findFirst({ where: eq(schools.id, invite.schoolId) });
  const inviter = await db.query.users.findFirst({ where: eq(users.id, invite.invitedByUserId) });

  return (
    <EinladungClient
      token={token}
      email={invite.email}
      schoolName={school?.name ?? "—"}
      inviterName={inviter?.displayName ?? "—"}
    />
  );
}
