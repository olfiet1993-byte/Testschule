"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { deleteContentItem, bulkCreateTerms } from "@/lib/actions/content";
import { deriveDraftFromContent } from "@/lib/actions/deriveDraft";
import { extractGlossary } from "@/lib/actions/aiTaskGen";
import {
  Trash2, Search, Sparkles, X, ArrowRight, BookOpen as GlossaryIcon, Check,
  FileText, Image as ImageIcon, Link2, BookOpen, Video, FileIcon,
} from "lucide-react";

const typeMeta = {
  text:  { icon: FileText,  label: "Text",    color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  image: { icon: ImageIcon, label: "Bild",    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  link:  { icon: Link2,     label: "Link",    color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30" },
  term:  { icon: BookOpen,  label: "Begriff", color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30" },
  video: { icon: Video,     label: "Video",   color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30" },
  file:  { icon: FileIcon,  label: "Datei",   color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
} as const;

const DERIVE_OPTIONS = [
  { type: "quiz", label: "Quiz", emoji: "❓", color: "bg-sky-500" },
  { type: "cloze", label: "Lückentext", emoji: "✍️", color: "bg-amber-500" },
  { type: "flashcards", label: "Karteikarten", emoji: "🃏", color: "bg-violet-500" },
  { type: "case_study", label: "Fallstudie", emoji: "🏥", color: "bg-rose-500" },
] as const;

export function BibliothekClient({
  items,
  myClasses = [],
}: {
  items: any[];
  myClasses?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [deriveFor, setDeriveFor] = useState<any | null>(null);
  const [deriveType, setDeriveType] = useState<string>("quiz");
  const [targetClass, setTargetClass] = useState<string>(myClasses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  // Glossar
  const [glossaryFor, setGlossaryFor] = useState<any | null>(null);
  const [glossaryTerms, setGlossaryTerms] = useState<{ term: string; definition: string; keep: boolean }[]>([]);
  const [glossaryStep, setGlossaryStep] = useState<"loading" | "review" | "done">("loading");
  const [glossaryResult, setGlossaryResult] = useState<{ added: number; skipped: number } | null>(null);

  async function openGlossary(item: any) {
    setGlossaryFor(item);
    setGlossaryStep("loading");
    setGlossaryResult(null);
    setError(null);
    try {
      const { terms } = await extractGlossary({ title: item.title, body: item.body ?? "" });
      const arr = Array.isArray(terms) ? terms : [];
      if (arr.length === 0) {
        setError("Keine Begriffe gefunden");
        setGlossaryFor(null);
        return;
      }
      setGlossaryTerms(arr.map((t: any) => ({
        term: String(t.term ?? "").trim(),
        definition: String(t.definition ?? "").trim(),
        keep: true,
      })).filter((t) => t.term && t.definition));
      setGlossaryStep("review");
    } catch (e: any) {
      setError(e.message ?? "Fehler");
      setGlossaryFor(null);
    }
  }

  async function saveGlossary() {
    if (!glossaryFor) return;
    const keep = glossaryTerms.filter((t) => t.keep);
    if (keep.length === 0) return alert("Markiere mindestens einen Begriff");
    start(async () => {
      try {
        const res = await bulkCreateTerms({ terms: keep, sourceTitle: glossaryFor.title });
        setGlossaryResult(res);
        setGlossaryStep("done");
        router.refresh();
      } catch (e: any) {
        alert(e.message ?? "Fehler");
      }
    });
  }

  function runDerive() {
    if (!deriveFor || !targetClass) return;
    setError(null);
    start(async () => {
      try {
        const { taskId } = await deriveDraftFromContent({
          type: deriveType as any,
          classId: targetClass,
          contentTitle: deriveFor.title,
          contentBody: deriveFor.body ?? "",
          imagePath: deriveFor.type === "image" ? deriveFor.imagePath : null,
          url: (deriveFor.type === "link" || deriveFor.type === "video" || deriveFor.type === "file") ? deriveFor.url : null,
        });
        setDeriveFor(null);
        router.push(`/aufgaben/${taskId}/bearbeiten`);
      } catch (e: any) {
        setError(e.message ?? "Fehler");
      }
    });
  }

  function canDerive(item: any): boolean {
    if (item.type === "image") return !!item.imagePath;
    if (item.type === "link" || item.type === "video" || item.type === "file") {
      // Mindestens ein Beschreibungstext nötig, da KI URL nicht abruft
      return !!item.url && (item.body ?? "").trim().length >= 10;
    }
    // text / term
    return (item.body ?? "").trim().length > 30;
  }

  function deriveLabel(item: any): string {
    if (item.type === "image") return "Aus Bild ableiten";
    if (item.type === "link" || item.type === "video" || item.type === "file") return "Aufgabe ableiten";
    return "Aufgabe ableiten";
  }

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return items.filter((i) => {
      if (activeType && i.type !== activeType) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.body ?? "").toLowerCase().includes(q) ||
        (i.tags ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, activeType]);

  const counts: Record<string, number> = {};
  for (const i of items) counts[i.type] = (counts[i.type] ?? 0) + 1;

  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-500 mb-3">Noch keine Inhalte in deiner Bibliothek.</p>
        <p className="text-xs text-slate-400">
          Tipp: lege Texte, Bilder (z. B. Anatomie-Tafeln), Links zu Studien, oder Fachbegriffe an.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Suchen…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setActiveType(null)}
          className={`px-3 h-10 rounded-lg text-sm font-medium transition ${
            activeType === null ? "bg-sky-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
          }`}
        >
          Alle ({items.length})
        </button>
        {Object.entries(typeMeta).map(([type, meta]) => {
          const cnt = counts[type] ?? 0;
          if (cnt === 0) return null;
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setActiveType(activeType === type ? null : type)}
              className={`inline-flex items-center gap-1 px-3 h-10 rounded-lg text-sm font-medium transition ${
                activeType === type
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="w-3 h-3" /> {meta.label} ({cnt})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const meta = (typeMeta as any)[item.type] ?? typeMeta.text;
          const Icon = meta.icon;
          return (
            <Card key={item.id} className="!p-4 relative group flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                  <Icon className="w-3 h-3" /> {meta.label}
                </span>
                <button
                  onClick={() => {
                    if (confirm(`'${item.title}' löschen?`)) {
                      start(() => { deleteContentItem(item.id); });
                    }
                  }}
                  disabled={pending}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold mb-1 text-sm">{item.title}</h3>

              {item.imagePath && (
                <img
                  src={item.imagePath}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded-md mb-2"
                />
              )}
              {item.body && (
                <p className="text-xs text-slate-500 line-clamp-3 mb-2">{item.body}</p>
              )}
              {item.url && (() => {
                const isLocal = item.url.startsWith("/uploads/");
                // Lesbarer Dateiname aus dem lokalen Pfad (nanoid-Präfix abschneiden)
                const fileName = isLocal
                  ? decodeURIComponent(item.url.split("/").pop() || "").replace(/^[A-Za-z0-9_-]{6}-/, "")
                  : item.url;
                return (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener"
                    {...(isLocal ? { download: fileName } : {})}
                    className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline truncate max-w-full mb-2"
                  >
                    {isLocal ? "📎 " : "🔗 "}
                    <span className="truncate">{isLocal ? fileName : item.url}</span>
                  </a>
                );
              })()}
              {item.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              )}

              {/* KI-Ableiten-Buttons */}
              {canDerive(item) && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDeriveFor(item);
                      setDeriveType("quiz");
                      setError(null);
                    }}
                    disabled={pending || myClasses.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 disabled:opacity-50 transition"
                    title={myClasses.length === 0 ? "Du brauchst eine Klasse, in die du den Entwurf legen kannst" : "Per KI eine Aufgabe daraus erzeugen"}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {deriveLabel(item)}
                  </button>
                  {item.type === "text" && (
                    <button
                      type="button"
                      onClick={() => openGlossary(item)}
                      disabled={pending}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-50 transition"
                      title="Fachbegriffe + Definitionen extrahieren"
                    >
                      <GlossaryIcon className="w-3.5 h-3.5" /> Glossar extrahieren
                    </button>
                  )}
                </div>
              )}
              {!canDerive(item) && (item.type === "link" || item.type === "video" || item.type === "file") && (
                <p className="text-[10px] text-amber-600 mt-2 italic">
                  Für KI-Ableitung bitte mind. 10 Zeichen Beschreibung ergänzen — die KI kann den Link selbst nicht öffnen.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Ableiten-Dialog */}
      {deriveFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md !p-5 shadow-lift">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold">Aufgabe ableiten</h3>
              <button onClick={() => setDeriveFor(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Aus <strong>„{deriveFor.title}"</strong> erstellt die KI eine Aufgabe — als <strong>Entwurf</strong>, den du danach prüfen und veröffentlichen kannst.
            </p>
            {deriveFor.type === "image" && (
              <div className="mb-4 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>Vision aktiv:</strong> Das Bild wird an Claude gesendet — die Aufgabe entsteht aus dem, was sichtbar ist.</span>
              </div>
            )}
            {(deriveFor.type === "link" || deriveFor.type === "video" || deriveFor.type === "file") && (
              <div className="mb-4 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>Hinweis:</strong> Die KI öffnet den Link nicht — sie nutzt deinen Titel + deine Beschreibung als Kontext.</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>Aufgabentyp</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {DERIVE_OPTIONS.map((o) => {
                    const active = deriveType === o.type;
                    return (
                      <button
                        key={o.type}
                        type="button"
                        onClick={() => setDeriveType(o.type)}
                        className={`p-3 rounded-lg text-sm font-medium text-left transition border-2 ${
                          active
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-xl mb-0.5">{o.emoji}</div>
                        <div>{o.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="target-class">Zielklasse (Entwurf)</Label>
                <select
                  id="target-class"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                >
                  {myClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={runDerive} disabled={pending || !targetClass} variant="brand" className="flex-1">
                  {pending ? "Claude denkt…" : <>Erzeugen <ArrowRight className="w-4 h-4" /></>}
                </Button>
                <Button variant="secondary" onClick={() => setDeriveFor(null)} disabled={pending}>
                  Abbrechen
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                Powered by Claude Haiku 4.5 · benötigt ANTHROPIC_API_KEY
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Glossar-Dialog */}
      {glossaryFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] !p-5 shadow-lift flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <GlossaryIcon className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Glossar extrahieren</h3>
              <button onClick={() => { setGlossaryFor(null); setGlossaryResult(null); }} className="ml-auto text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {glossaryStep === "loading" && (
              <div className="text-center py-10">
                <Sparkles className="w-10 h-10 text-violet-500 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-slate-500">Claude liest „{glossaryFor.title}" und extrahiert Fachbegriffe…</p>
              </div>
            )}

            {glossaryStep === "review" && (
              <>
                <p className="text-xs text-slate-500 mb-3 flex-shrink-0">
                  {glossaryTerms.length} Begriffe gefunden. Hake ab, was du übernehmen willst — wird als <strong>Fachbegriff-Items</strong> in die Bibliothek gespeichert.
                </p>
                <ul className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
                  {glossaryTerms.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                      <input
                        type="checkbox"
                        checked={t.keep}
                        onChange={(e) => setGlossaryTerms((arr) => arr.map((x, j) => j === i ? { ...x, keep: e.target.checked } : x))}
                        className="w-4 h-4 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          value={t.term}
                          onChange={(e) => setGlossaryTerms((arr) => arr.map((x, j) => j === i ? { ...x, term: e.target.value } : x))}
                          className="w-full text-sm font-semibold border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1"
                        />
                        <textarea
                          value={t.definition}
                          onChange={(e) => setGlossaryTerms((arr) => arr.map((x, j) => j === i ? { ...x, definition: e.target.value } : x))}
                          rows={2}
                          className="w-full text-xs text-slate-600 dark:text-slate-300 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1 mt-1 resize-none"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-3 flex-shrink-0 border-t border-slate-100 dark:border-slate-800 mt-3">
                  <Button onClick={saveGlossary} disabled={pending} variant="brand" className="flex-1">
                    <Check className="w-4 h-4" />
                    {pending ? "Speichere…" : `${glossaryTerms.filter((t) => t.keep).length} übernehmen`}
                  </Button>
                  <Button variant="secondary" onClick={() => setGlossaryFor(null)} disabled={pending}>Abbrechen</Button>
                </div>
              </>
            )}

            {glossaryStep === "done" && glossaryResult && (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mx-auto flex items-center justify-center mb-3">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
                <h4 className="font-semibold mb-1">{glossaryResult.added} Begriffe übernommen</h4>
                {glossaryResult.skipped > 0 && (
                  <p className="text-xs text-slate-500">{glossaryResult.skipped} übersprungen (Titel existiert bereits)</p>
                )}
                <p className="text-xs text-slate-500 mt-2">Du findest sie unten in der Bibliothek als „Begriff".</p>
                <Button className="mt-4" onClick={() => { setGlossaryFor(null); setGlossaryResult(null); }}>OK</Button>
              </div>
            )}
          </Card>
        </div>
      )}
      {filtered.length === 0 && (
        <p className="text-center text-slate-500 mt-8">Keine Treffer.</p>
      )}
    </>
  );
}
