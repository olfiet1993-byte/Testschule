"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { copyFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const KEEP_LAST_N = 30; // 30 Tage Aufbewahrung

export async function runBackup() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");

  const dataDir = path.join(process.cwd(), "data");
  const backupsDir = path.join(dataDir, "backups");
  await mkdir(backupsDir, { recursive: true });

  const dbPath = path.join(dataDir, "testschule.db");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const targetPath = path.join(backupsDir, `testschule-${stamp}.db`);

  await copyFile(dbPath, targetPath);
  const info = await stat(targetPath);

  // Rotation: behalte nur die letzten N Backups
  const files = await readdir(backupsDir);
  const dbFiles = files
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse();
  for (const f of dbFiles.slice(KEEP_LAST_N)) {
    await unlink(path.join(backupsDir, f));
  }

  await logAudit({
    schoolId: session.user.schoolId,
    actorId: session.user.id,
    actorName: session.user.displayName,
    action: "backup.run",
    entityType: "backup",
    entityId: stamp,
    summary: `Backup erstellt (${(info.size / 1024).toFixed(1)} KB)`,
  });

  revalidatePath("/schule");
  return { filename: path.basename(targetPath), sizeKB: Math.round(info.size / 1024) };
}

export async function listBackups(): Promise<Array<{ name: string; sizeKB: number; date: Date }>> {
  const backupsDir = path.join(process.cwd(), "data", "backups");
  try {
    const files = await readdir(backupsDir);
    const stats = await Promise.all(
      files.filter((f) => f.endsWith(".db")).map(async (f) => {
        const s = await stat(path.join(backupsDir, f));
        return { name: f, sizeKB: Math.round(s.size / 1024), date: s.mtime };
      }),
    );
    return stats.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}
