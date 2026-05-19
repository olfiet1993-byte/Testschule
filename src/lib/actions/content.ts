"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contentItems } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

async function teacher() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") throw new Error("Nicht autorisiert");
  return session.user;
}

export async function createContentItem(formData: FormData) {
  const me = await teacher();
  const type = String(formData.get("type") ?? "text") as
    "text" | "image" | "link" | "term" | "video" | "file";
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "").trim() || null;

  if (!title) throw new Error("Titel fehlt");

  let imagePath: string | null = null;
  if (type === "image") {
    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const filename = `${nanoid(10)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), buffer);
      imagePath = `/uploads/${filename}`;
    }
  }

  await db.insert(contentItems).values({
    schoolId: me.schoolId,
    ownerId: me.id,
    type,
    title,
    body,
    url,
    imagePath,
    tags,
  });

  revalidatePath("/bibliothek");
  redirect("/bibliothek");
}

export async function deleteContentItem(id: string) {
  const me = await teacher();
  await db.delete(contentItems).where(
    and(eq(contentItems.id, id), eq(contentItems.ownerId, me.id))
  );
  revalidatePath("/bibliothek");
}

/**
 * Speichert mehrere Begriffe (term-Items) in die Bibliothek auf einmal.
 * Übersprungen werden Einträge, deren Titel schon existiert (Owner-spezifisch).
 */
export async function bulkCreateTerms(input: {
  terms: { term: string; definition: string }[];
  sourceTitle?: string;
}): Promise<{ added: number; skipped: number }> {
  const me = await teacher();
  const clean = input.terms
    .map((t) => ({ term: String(t.term ?? "").trim(), definition: String(t.definition ?? "").trim() }))
    .filter((t) => t.term && t.definition);
  if (clean.length === 0) return { added: 0, skipped: 0 };

  // Vorhandene Term-Titel des Lehrers
  const mine = await db.query.contentItems.findMany({ where: eq(contentItems.ownerId, me.id) });
  const lower = new Set(mine.filter((c) => c.type === "term").map((c) => c.title.toLowerCase()));

  let added = 0;
  let skipped = 0;
  const tags = input.sourceTitle ? `aus: ${input.sourceTitle}` : null;
  for (const t of clean) {
    if (lower.has(t.term.toLowerCase())) {
      skipped++;
      continue;
    }
    await db.insert(contentItems).values({
      schoolId: me.schoolId,
      ownerId: me.id,
      type: "term",
      title: t.term,
      body: t.definition,
      tags,
    });
    added++;
  }
  revalidatePath("/bibliothek");
  return { added, skipped };
}
