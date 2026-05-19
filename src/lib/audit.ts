import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditAction =
  | "task.create"
  | "task.publish"
  | "task.unpublish"
  | "task.delete"
  | "class.create"
  | "class.delete"
  | "member.add"
  | "member.remove"
  | "invite.send"
  | "invite.accept"
  | "invite.revoke"
  | "backup.run";

export async function logAudit(input: {
  schoolId: string;
  actorId: string | null;
  actorName: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  summary: string;
}) {
  try {
    await db.insert(auditLog).values({
      schoolId: input.schoolId,
      actorId: input.actorId ?? null,
      actorName: input.actorName,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      summary: input.summary,
    });
  } catch (e) {
    console.error("Audit-Log fehlgeschlagen:", e);
  }
}
