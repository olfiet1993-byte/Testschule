"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { vitalScenarios, classMembers, classes } from "@/db/schema";
import { canManageClass } from "@/lib/permissions";
import { eq, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type VitalsPayload = {
  vitals: {
    pulse: number;
    systolic: number;
    diastolic: number;
    respRate: number;
    spo2: number;
    tempC: number;
    consciousness: "alert" | "verwirrt" | "somnolent" | "bewusstlos";
  };
  abnormal: string[];
  diagnosis: string;
  correctActions: string[];
  distractorActions: string[];
};

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

export async function createVitalScenario(input: {
  classId: string;
  topicId?: string | null;
  patientName: string;
  age: number;
  context: string;
  payload: VitalsPayload;
  published?: boolean;
}) {
  const teacher = await requireTeacher();
  if (!(await canManageClass(teacher.id, input.classId))) throw new Error("Keine Berechtigung");
  if (!input.patientName.trim()) throw new Error("Patient:innen-Name fehlt");
  if (!input.context.trim()) throw new Error("Kontext fehlt");
  if (input.age < 0 || input.age > 130) throw new Error("Ungültiges Alter");

  const [s] = await db.insert(vitalScenarios).values({
    classId: input.classId,
    topicId: input.topicId ?? null,
    patientName: input.patientName.trim(),
    age: input.age,
    context: input.context.trim(),
    payload: JSON.stringify(input.payload),
    published: input.published ?? true,
    createdBy: teacher.id,
    createdAt: new Date(),
  }).returning();
  revalidatePath(`/klassen/${input.classId}/vitalsim`);
  return s.id;
}

export async function deleteVitalScenario(id: string) {
  const teacher = await requireTeacher();
  const s = await db.query.vitalScenarios.findFirst({ where: eq(vitalScenarios.id, id) });
  if (!s) throw new Error("Szenario nicht gefunden");
  if (!(await canManageClass(teacher.id, s.classId))) throw new Error("Keine Berechtigung");
  await db.delete(vitalScenarios).where(eq(vitalScenarios.id, id));
  revalidatePath(`/klassen/${s.classId}/vitalsim`);
}

export async function togglePublishScenario(id: string) {
  const teacher = await requireTeacher();
  const s = await db.query.vitalScenarios.findFirst({ where: eq(vitalScenarios.id, id) });
  if (!s) throw new Error("Szenario nicht gefunden");
  if (!(await canManageClass(teacher.id, s.classId))) throw new Error("Keine Berechtigung");
  await db.update(vitalScenarios).set({ published: !s.published }).where(eq(vitalScenarios.id, id));
  revalidatePath(`/klassen/${s.classId}/vitalsim`);
}
