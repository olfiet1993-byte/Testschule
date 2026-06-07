"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createContentItem } from "@/lib/actions/content";
import { FileText, Image as ImageIcon, Link2, BookOpen, Video, FileIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

const types = [
  { value: "text", label: "Text/Notiz", icon: FileText, hint: "Erklärung, Definition, Auszug" },
  { value: "image", label: "Bild", icon: ImageIcon, hint: "Anatomie, OP-Besteck, Schema" },
  { value: "link", label: "Link", icon: Link2, hint: "Externe Quelle, Studie, Artikel" },
  { value: "term", label: "Fachbegriff", icon: BookOpen, hint: "Begriff + Definition (Karteikarten)" },
  { value: "video", label: "Video", icon: Video, hint: "YouTube/Vimeo-URL" },
  { value: "file", label: "Datei", icon: FileIcon, hint: "PDF, Dokument als Link" },
] as const;

export function NewContentForm() {
  const [type, setType] = useState<string>("text");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  return (
    <>
      <Link href="/bibliothek" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zur Bibliothek
      </Link>

      <h1 className="text-2xl font-bold mb-6">Neuer Inhalt</h1>

      <Card className="mb-6">
        <Label>Typ wählen</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
          {types.map((t) => {
            const Icon = t.icon;
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`p-3 rounded-lg border text-left transition ${
                  active
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${active ? "text-sky-600" : "text-slate-400"}`} />
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-slate-500 mt-1">{t.hint}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <form
          action={async (fd) => {
            setSubmitting(true);
            try {
              await createContentItem(fd);
            } catch (e: any) {
              alert(e.message || "Fehler beim Speichern");
              setSubmitting(false);
            }
          }}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <input type="hidden" name="type" value={type} />

          <div>
            <Label htmlFor="title">
              {type === "term" ? "Begriff (z. B. 'Dekubitus')" : "Titel"}
            </Label>
            <Input id="title" name="title" required className="mt-1" />
          </div>

          {(type === "text" || type === "term") && (
            <div>
              <Label htmlFor="body">{type === "term" ? "Definition / Erklärung" : "Inhalt"}</Label>
              <textarea
                id="body"
                name="body"
                rows={5}
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                required
              />
            </div>
          )}

          {type === "image" && (
            <>
              <div>
                <Label htmlFor="image">Bild-Datei (JPG/PNG)</Label>
                <input
                  id="image"
                  type="file"
                  name="image"
                  accept="image/*"
                  required
                  className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
              </div>
              <div>
                <Label htmlFor="body">Beschreibung (optional)</Label>
                <textarea
                  id="body"
                  name="body"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
            </>
          )}

          {(type === "link" || type === "video") && (
            <>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="body">Beschreibung (optional)</Label>
                <textarea
                  id="body"
                  name="body"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
            </>
          )}

          {type === "file" && (
            <>
              <div>
                <Label htmlFor="file">Datei hochladen (PDF, Word, PowerPoint, …)</Label>
                <input
                  id="file"
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.txt,.rtf,.csv"
                  className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Vom Rechner auswählen — max. 20 MB.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                oder
                <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <Label htmlFor="url">Link zur Datei (statt Upload)</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="body">Beschreibung (optional)</Label>
                <textarea
                  id="body"
                  name="body"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="tags">Tags (kommagetrennt)</Label>
            <Input id="tags" name="tags" placeholder="z. B. Anatomie, Niere, Stoffwechsel" className="mt-1" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Speichere…" : "Speichern"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
