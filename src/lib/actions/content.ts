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
  let url = String(formData.get("url") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "").trim() || null;

  if (!title) throw new Error("Titel fehlt");

  const MAX = 50 * 1024 * 1024; // 50 MB
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  async function saveUpload(file: File): Promise<string> {
    if (file.size > MAX) throw new Error("Datei zu groß (max. 50 MB)");
    await mkdir(uploadDir, { recursive: true });
    // Original-Namen lesbar behalten, mit kurzem Präfix für Eindeutigkeit
    const safeName =
      file.name
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .slice(-80) || "datei";
    const filename = `${nanoid(6)}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  }

  let imagePath: string | null = null;

  // Bild-Typ nutzt das dedizierte "image"-Feld → landet in imagePath
  if (type === "image") {
    const file = formData.get("image") as File | null;
    if (file && file.size > 0) {
      imagePath = await saveUpload(file);
    }
  }

  // Lokaler Datei-Upload für ALLE Typen über das "file"-Feld → landet in url.
  // Bei text/term ist es ein optionaler Anhang, bei link/video/file eine Alternative zum Link.
  const upload = formData.get("file") as File | null;
  if (upload && upload.size > 0) {
    url = await saveUpload(upload);
  }

  // Pflicht-Quelle prüfen: Link- und Datei-Typ brauchen entweder Upload oder URL
  if ((type === "link" || type === "video" || type === "file") && !url) {
    throw new Error("Bitte eine Datei hochladen oder einen Link angeben");
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
