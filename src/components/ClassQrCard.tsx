"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { QrCode as QrIcon, Printer, Copy, Check, ExternalLink } from "lucide-react";

/**
 * Zeigt einen QR-Code zum Beitritt in eine Klasse.
 * Die URL wird zur Laufzeit erzeugt, damit sie sowohl lokal als auch unter Tailscale-Funnel passt.
 */
export function ClassQrCard({
  inviteCode,
  className,
  teacherName,
}: {
  inviteCode: string;
  className: string;
  teacherName?: string | null;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = `${window.location.origin}/login?code=${encodeURIComponent(inviteCode)}`;
    setUrl(u);
    QRCode.toString(u, {
      type: "svg",
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setSvg).catch(() => setSvg(null));
  }, [inviteCode]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  function printPoster() {
    // Druckansicht via Popup-Window — saubere Trennung vom Hauptlayout
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>QR-Beitritt — ${className}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Inter, sans-serif; padding: 4rem 2rem; text-align: center; color: #0f172a; }
  h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }
  h2 { font-size: 1.25rem; margin: 0 0 2.5rem; color: #475569; font-weight: 500; }
  .qr { display: inline-block; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 1rem; background: #fff; }
  .qr svg { display: block; width: 280px; height: 280px; }
  .code { display: inline-block; margin-top: 1.5rem; font-family: ui-monospace, "SF Mono", monospace; font-size: 2rem; letter-spacing: 0.3em; font-weight: 700; padding: 0.5rem 1.5rem; background: #f1f5f9; border-radius: 0.5rem; }
  .steps { margin: 3rem auto 0; max-width: 28rem; text-align: left; counter-reset: step; }
  .step { padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; counter-increment: step; }
  .step::before { content: counter(step); display: inline-flex; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: #0ea5e9; color: #fff; align-items: center; justify-content: center; margin-right: 0.75rem; font-weight: 600; }
  .teacher { color: #64748b; margin-top: 2rem; font-size: 0.9rem; }
  @media print { body { padding: 1cm; } @page { size: A4 portrait; margin: 1cm; } }
</style></head>
<body>
  <h1>${className}</h1>
  <h2>Hier ist dein Klassen-Beitritt</h2>
  <div class="qr">${svg ?? ""}</div>
  <div class="code">${inviteCode}</div>
  <div class="steps">
    <div class="step">Kamera deines Handys öffnen</div>
    <div class="step">QR-Code scannen</div>
    <div class="step">Auf den Login-Link tippen</div>
    <div class="step">Vornamen + 4-stellige PIN festlegen</div>
  </div>
  ${teacherName ? `<div class="teacher">Klasse von ${teacherName}</div>` : ""}
  <script>setTimeout(() => window.print(), 300);</script>
</body></html>`);
    w.document.close();
  }

  return (
    <Card className="!p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
          <QrIcon className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">Schüler:innen-Beitritt</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Code per Kamera scannen — landet direkt im Login.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
        <div className="bg-white p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[240px]">
          {svg ? (
            <div
              className="w-56 h-56 [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="w-56 h-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Klassen-Code</div>
            <div className="inline-block font-mono font-bold text-2xl tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
              {inviteCode}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Direkt-Link</div>
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 break-all">
              <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex-1 truncate" title={url}>{url || "…"}</code>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={copyUrl} disabled={!url}>
              {copied ? <><Check className="w-3.5 h-3.5" /> Kopiert</> : <><Copy className="w-3.5 h-3.5" /> Link kopieren</>}
            </Button>
            <Button size="sm" variant="secondary" onClick={printPoster} disabled={!svg}>
              <Printer className="w-3.5 h-3.5" /> Poster drucken
            </Button>
            {url && (
              <a href={url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline self-center">
                <ExternalLink className="w-3 h-3" /> öffnen
              </a>
            )}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            iPhone/Android-Kamera scannt den Code automatisch. Die Schüler:innen tippen einmal auf den Link, legen Namen + PIN fest, und sind in der Klasse.
          </p>
        </div>
      </div>
    </Card>
  );
}
