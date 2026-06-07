"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createContentItem } from "@/lib/actions/content";
import { FileText, Image as ImageIcon, Link2, BookOpen, Video, FileIcon, ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

const types = [
  { value: "text", label: "Text/Notiz", icon: FileText, hint: "Erklärung, Definition, Auszug" },
  { value: "image", label: "Bild", icon: ImageIcon, hint: "Anatomie, OP-Besteck, Schema" },
  { value: "link", label: "Link", icon: Link2, hint: "Externe Quelle, Studie, Artikel" },
  { value: "term", label: "Fachbegriff", icon: BookOpen, hint: "Begriff + Definition (Karteikarten)" },
  { value: "video", label: "Video", icon: Video, hint: "YouTube/Vimeo-Link oder lokale Datei" },
  { value: "file", label: "Datei", icon: FileIcon, hint: "PDF, Dokument vom Rechner" },
] as const;

// --- Wiederverwendbare Feld-Bausteine ---

function FileField({
  name,
  label,
  accept,
  required,
  hint,
}: {
  name: string;
  label: string;
  accept?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={name} className="inline-flex items-center gap-1.5">
        <Upload className="w-3.5 h-3.5 text-sky-500" /> {label}
      </Label>
      <input
        id={name}
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sky-600 file:text-white file:font-medium file:cursor-pointer hover:file:bg-sky-500 text-slate-500"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      oder
      <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
    </div>
  );
}

function BodyField({
  label,
  required,
  rows = 2,
}: {
  label: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <Label htmlFor="body">{label}</Label>
      <textarea
        id="body"
        name="body"
        rows={rows}
        required={required}
        className="w-full mt-1 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
      />
    </div>
  );
}

const ANY_FILE_HINT = "Alle gängigen Formate (PDF, Word, PowerPoint, Excel, Bilder, Audio, Video, ZIP …) — max. 50 MB.";

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

          {/* TEXT / FACHBEGRIFF: Inhalt + optionaler lokaler Anhang */}
          {(type === "text" || type === "term") && (
            <>
              <BodyField
                label={type === "term" ? "Definition / Erklärung" : "Inhalt"}
                required
                rows={5}
              />
              <FileField
                name="file"
                label="Datei vom Rechner anhängen (optional)"
                hint="z. B. Skript, Foto, PDF zum Begriff — alle Formate, max. 50 MB."
              />
            </>
          )}

          {/* BILD: lokaler Bild-Upload */}
          {type === "image" && (
            <>
              <FileField
                name="image"
                label="Bild vom Rechner"
                accept="image/*"
                required
                hint="JPG, PNG, GIF, WebP, SVG — max. 50 MB."
              />
              <BodyField label="Beschreibung (optional)" />
            </>
          )}

          {/* LINK: URL ODER lokale Datei */}
          {type === "link" && (
            <>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" className="mt-1" />
              </div>
              <OrDivider />
              <FileField
                name="file"
                label="Datei vom Rechner (statt Link)"
                hint={ANY_FILE_HINT}
              />
              <BodyField label="Beschreibung (optional)" />
            </>
          )}

          {/* VIDEO: URL ODER lokale Videodatei */}
          {type === "video" && (
            <>
              <div>
                <Label htmlFor="url">Video-Link (YouTube / Vimeo)</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" className="mt-1" />
              </div>
              <OrDivider />
              <FileField
                name="file"
                label="Video vom Rechner hochladen"
                accept="video/*"
                hint="MP4, MOV, WebM, … — max. 50 MB."
              />
              <BodyField label="Beschreibung (optional)" />
            </>
          )}

          {/* DATEI: lokaler Upload ODER Link */}
          {type === "file" && (
            <>
              <FileField
                name="file"
                label="Datei hochladen"
                hint={ANY_FILE_HINT}
              />
              <OrDivider />
              <div>
                <Label htmlFor="url">Link zur Datei (statt Upload)</Label>
                <Input id="url" name="url" type="url" placeholder="https://…" className="mt-1" />
              </div>
              <BodyField label="Beschreibung (optional)" />
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
