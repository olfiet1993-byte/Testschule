"use client";

import { useState } from "react";
import { Card, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Download, X, FileText, FileSpreadsheet, Presentation, Printer, Check } from "lucide-react";

export type ExportFormat = "docx" | "xlsx" | "pptx" | "pdf";

type FormatOption = {
  value: ExportFormat;
  label: string;
  description: string;
  icon: any;
  color: string;
};

const ALL_FORMATS: Record<ExportFormat, FormatOption> = {
  docx: {
    value: "docx",
    label: "Word",
    description: "Bearbeitbares Dokument, ideal als Arbeitsblatt",
    icon: FileText,
    color: "from-sky-500 to-blue-600",
  },
  xlsx: {
    value: "xlsx",
    label: "Excel",
    description: "Tabelle mit Formeln, mehreren Sheets, Farbcodierung",
    icon: FileSpreadsheet,
    color: "from-emerald-500 to-green-600",
  },
  pptx: {
    value: "pptx",
    label: "PowerPoint",
    description: "Folien zum Präsentieren in der Klasse",
    icon: Presentation,
    color: "from-amber-500 to-orange-600",
  },
  pdf: {
    value: "pdf",
    label: "PDF / Druck",
    description: "Browser-Druckansicht — speichern als PDF möglich",
    icon: Printer,
    color: "from-slate-500 to-slate-700",
  },
};

export function ExportModal({
  open,
  onClose,
  title,
  formats,
  buildUrl,
  onPdf,
  showSolutionsToggle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  formats: ExportFormat[];
  /** Baut die Download-URL aus dem gewählten Format + Optionen. Null für PDF (nutzt onPdf). */
  buildUrl: (format: ExportFormat, options: { withSolutions: boolean }) => string | null;
  /** Wird gerufen wenn PDF gewählt — z. B. window.print() oder Navigation zur Print-Route */
  onPdf?: () => void;
  showSolutionsToggle?: boolean;
}) {
  const [withSolutions, setWithSolutions] = useState(true);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  if (!open) return null;

  async function handleExport(format: ExportFormat) {
    if (format === "pdf") {
      onPdf?.();
      onClose();
      return;
    }
    const url = buildUrl(format, { withSolutions });
    if (!url) return;
    setDownloading(format);
    try {
      // Direkt-Download anstoßen
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Kurz UI-Feedback
      setTimeout(() => {
        setDownloading(null);
        onClose();
      }, 800);
    } catch (e: any) {
      alert(e.message ?? "Fehler beim Download");
      setDownloading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg !p-5 shadow-lift">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-sky-500" />
          <h3 className="font-semibold">Exportieren</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4 -mt-1">{title}</p>

        {showSolutionsToggle && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={withSolutions}
              onChange={(e) => setWithSolutions(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Lösungen mit einfügen</span>
            <span className="text-xs text-slate-400">— für die Lehrer-Version; aushaken für Schüler-Arbeitsblatt</span>
          </label>
        )}

        <div className="space-y-2">
          {formats.map((f) => {
            const meta = ALL_FORMATS[f];
            const Icon = meta.icon;
            const isLoading = downloading === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => handleExport(f)}
                disabled={!!downloading}
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition disabled:opacity-50 text-left flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white flex-shrink-0`}>
                  {isLoading ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{meta.label}</div>
                  <div className="text-xs text-slate-500">{meta.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
