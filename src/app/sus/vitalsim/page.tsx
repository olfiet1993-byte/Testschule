import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classMembers, vitalScenarios } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { VitalSim } from "./VitalSim";

export default async function VitalSimPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Eigene Lehrer-Szenarien aus den Klassen des Schülers
  let customScenarios: any[] = [];
  if (session.user.role === "student") {
    const memberships = await db.query.classMembers.findMany({
      where: eq(classMembers.userId, session.user.id),
    });
    const classIds = memberships.map((m) => m.classId);
    if (classIds.length > 0) {
      const rows = await db.query.vitalScenarios.findMany({
        where: and(inArray(vitalScenarios.classId, classIds), eq(vitalScenarios.published, true)),
      });
      customScenarios = rows.map((s) => {
        const p = typeof s.payload === "string" ? JSON.parse(s.payload) : s.payload;
        return {
          id: s.id,
          patient: s.patientName,
          age: s.age,
          context: s.context,
          vitals: p.vitals,
          abnormal: p.abnormal ?? [],
          diagnosis: p.diagnosis ?? "",
          correctActions: p.correctActions ?? [],
          distractorActions: p.distractorActions ?? [],
        };
      });
    }
  }

  return (
    <AppShell>
      <VitalSim customScenarios={JSON.parse(JSON.stringify(customScenarios))} />
    </AppShell>
  );
}
