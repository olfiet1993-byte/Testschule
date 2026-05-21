import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, ImageRun,
} from "docx";

type QuizPayload = {
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
};
type ClozePayload = {
  text: string;
  blanks: Array<{ index: number; answers: string[]; caseSensitive?: boolean }>;
};
type FlashcardPayload = {
  cards: Array<{ front: string; back: string }>;
};
type CasePayload = {
  intro?: string;
  situation?: string;
  steps?: Array<{
    description?: string;
    question: string;
    options?: Array<{ text: string; isCorrect: boolean; feedback?: string }>;
  }>;
  questions?: Array<{ question: string; sampleAnswer?: string }>;
};
type Task = {
  id: string;
  title: string;
  description?: string | null;
  type: "quiz" | "cloze" | "flashcards" | "case_study" | "image_hotspot";
  payload: string;
  xpReward?: number;
  difficulty?: number | null;
};

// === Brand-Farben (hex ohne #) ===
const BRAND_SKY = "0EA5E9";
const BRAND_VIOLET = "8B5CF6";
const TEXT_DARK = "0F172A";
const TEXT_GREY = "64748B";
const TEXT_LIGHT_GREY = "94A3B8";
const BG_GREEN_LIGHT = "DCFCE7";
const BG_GREEN_BORDER = "16A34A";
const BG_ROSE_LIGHT = "FEE2E2";
const BG_VIOLET_LIGHT = "EDE9FE";
const BG_VIOLET_BORDER = "8B5CF6";
const BG_AMBER_LIGHT = "FEF3C7";
const BG_SLATE_LIGHT = "F1F5F9";

const DIFF_META = {
  1: { label: "leicht", color: "10B981", emoji: "🟢" },
  2: { label: "mittel", color: "F59E0B", emoji: "🟡" },
  3: { label: "schwer", color: "EF4444", emoji: "🔴" },
} as const;

const TYPE_LABEL: Record<string, string> = {
  quiz: "Quiz",
  cloze: "Lückentext",
  flashcards: "Karteikarten",
  case_study: "Fallstudie",
  image_hotspot: "Bildhotspot",
};

/**
 * Wandelt eine Aufgabe in ein hochwertiges .docx-Buffer (Word) um.
 * Mit Brand-Header, farbiger Akzentleiste, Tabellen für Optionen, Footer mit Seitenzahl.
 */
export async function taskToDocx(
  task: Task,
  options: { withSolutions: boolean; className?: string },
): Promise<Buffer> {
  const payload = JSON.parse(task.payload);
  const children: any[] = [];

  // === 1) Brand-Header (große farbige Box mit Titel + Meta) ===
  children.push(brandHeader(task, options.className));
  children.push(spacer(200));

  // === 2) Beschreibung als Hinweis-Box ===
  if (task.description?.trim()) {
    children.push(infoBox(task.description, BG_SLATE_LIGHT));
    children.push(spacer(200));
  }

  // === 3) Aufgabe-spezifisches Layout ===
  switch (task.type) {
    case "quiz":
      renderQuiz(payload as QuizPayload, children, options.withSolutions);
      break;
    case "cloze":
      renderCloze(payload as ClozePayload, children, options.withSolutions);
      break;
    case "flashcards":
      renderFlashcards(payload as FlashcardPayload, children, options.withSolutions);
      break;
    case "case_study":
      renderCase(payload as CasePayload, children, options.withSolutions);
      break;
    default:
      children.push(new Paragraph({ children: [new TextRun("(Typ nicht exportierbar)")] }));
  }

  // === 4) Schluss-Hinweis ===
  if (!options.withSolutions) {
    children.push(spacer(300));
    children.push(infoBox(
      "📝 Notizen / weitere Überlegungen:",
      BG_VIOLET_LIGHT,
    ));
    // Notiz-Linien
    for (let i = 0; i < 5; i++) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "_".repeat(80), color: TEXT_LIGHT_GREY })],
        spacing: { before: 80, after: 60 },
      }));
    }
  }

  // === Dokument ===
  const doc = new Document({
    creator: "Test Schule",
    title: task.title,
    description: task.description ?? undefined,
    styles: {
      default: {
        document: {
          run: { font: "Aptos", size: 22 }, // 11pt
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Test Schule", bold: true, color: BRAND_SKY, size: 18 }),
                new TextRun({ text: "  ·  Pflegeausbildung", color: TEXT_GREY, size: 18 }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_SKY } },
              spacing: { before: 100 },
              children: [
                new TextRun({ text: task.title, color: TEXT_GREY, size: 16 }),
                new TextRun({ text: "  ·  Seite ", color: TEXT_LIGHT_GREY, size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], color: TEXT_LIGHT_GREY, size: 16 }),
                new TextRun({ text: " von ", color: TEXT_LIGHT_GREY, size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], color: TEXT_LIGHT_GREY, size: 16 }),
                new TextRun({ text: "  ·  Stand: " + new Date().toLocaleDateString("de-DE"), color: TEXT_LIGHT_GREY, size: 16 }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}

// ============ HELPERS ============

function spacer(twips: number) {
  return new Paragraph({ spacing: { before: twips, after: 0 }, children: [new TextRun("")] });
}

function brandHeader(task: Task, className?: string) {
  const typeLabel = TYPE_LABEL[task.type] ?? task.type;
  const diff = task.difficulty ? DIFF_META[task.difficulty as 1 | 2 | 3] : null;

  // Header als 1-Zellen-Tabelle mit Sky-Background + dicker Akzentlinie unten
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.SINGLE, size: 24, color: BRAND_SKY },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: BRAND_SKY, fill: BRAND_SKY },
            margins: { top: 240, bottom: 240, left: 360, right: 360 },
            children: [
              // Tag-Zeile oben
              new Paragraph({
                children: [
                  new TextRun({
                    text: typeLabel.toUpperCase(),
                    bold: true, color: "FFFFFF", size: 18,
                  }),
                  ...(diff
                    ? [
                        new TextRun({ text: "    ·    ", color: "BAE6FD", size: 18 }),
                        new TextRun({ text: diff.emoji + " " + diff.label, color: "FFFFFF", size: 18 }),
                      ]
                    : []),
                  ...(task.xpReward
                    ? [
                        new TextRun({ text: "    ·    ", color: "BAE6FD", size: 18 }),
                        new TextRun({ text: task.xpReward + " XP", color: "FFFFFF", size: 18 }),
                      ]
                    : []),
                ],
                spacing: { after: 120 },
              }),
              // Titel
              new Paragraph({
                children: [new TextRun({ text: task.title, bold: true, color: "FFFFFF", size: 40 })],
                spacing: { after: 80 },
              }),
              // Class-Zeile unten (falls vorhanden)
              ...(className
                ? [
                    new Paragraph({
                      children: [new TextRun({ text: className, color: "DBEAFE", size: 20, italics: true })],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoBox(text: string, bg: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: bg, fill: bg },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [new TextRun({ text, italics: true, color: TEXT_DARK })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function sectionHeading(text: string, accent = BRAND_SKY) {
  // Heading mit kleinem farbigem Quadrat davor
  return new Paragraph({
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({ text: "▎", color: accent, size: 32 }),
      new TextRun({ text: "  " + text, bold: true, size: 28, color: TEXT_DARK }),
    ],
  });
}

// ============ QUIZ ============

function renderQuiz(p: QuizPayload, out: any[], withSolutions: boolean) {
  if (!Array.isArray(p.questions)) return;
  p.questions.forEach((q, qi) => {
    out.push(sectionHeading(`Frage ${qi + 1}`));
    out.push(new Paragraph({
      children: [new TextRun({ text: q.question, size: 24 })],
      spacing: { after: 200 },
    }));

    // Optionen als Tabelle: 2 Spalten (Marker + Text)
    const optionRows = q.options.map((opt, oi) => {
      const isCorrect = withSolutions && oi === q.correctIndex;
      const bg = isCorrect ? BG_GREEN_LIGHT : "FFFFFF";
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: bg, fill: bg },
            margins: { top: 100, bottom: 100, left: 160, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isCorrect ? "✓" : "○",
                    bold: true,
                    size: 28,
                    color: isCorrect ? BG_GREEN_BORDER : TEXT_LIGHT_GREY,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: bg, fill: bg },
            margins: { top: 100, bottom: 100, left: 100, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: String.fromCharCode(65 + oi) + ") ",
                    bold: true,
                    color: TEXT_GREY,
                  }),
                  new TextRun({
                    text: opt,
                    bold: isCorrect,
                    color: TEXT_DARK,
                  }),
                ],
              }),
            ],
          }),
        ],
      });
    });

    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "F1F5F9" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: optionRows,
    }));

    // Erklärung
    if (withSolutions && q.explanation?.trim()) {
      out.push(spacer(120));
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.SINGLE, size: 24, color: BG_VIOLET_BORDER },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { type: ShadingType.SOLID, color: BG_VIOLET_LIGHT, fill: BG_VIOLET_LIGHT },
                margins: { top: 140, bottom: 140, left: 240, right: 240 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "💡 Erklärung: ", bold: true, color: BRAND_VIOLET, size: 20 }),
                      new TextRun({ text: q.explanation, italics: true, color: TEXT_DARK, size: 20 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }));
    }
    out.push(spacer(200));
  });
}

// ============ CLOZE ============

function renderCloze(p: ClozePayload, out: any[], withSolutions: boolean) {
  if (!p.text) return;
  out.push(sectionHeading("Lückentext"));

  // Text mit ersetzten Lücken
  let i = 0;
  const text = p.text.replace(/\{\{[^}]*\}\}/g, () => {
    const ans = p.blanks?.[i]?.answers?.[0] ?? "";
    const replacement = withSolutions ? `  ▸${ans}◂  ` : "  __________  ";
    i++;
    return replacement;
  });

  // Absätze
  text.split(/\n+/).forEach((line) => {
    if (!line.trim()) return;
    out.push(new Paragraph({
      children: [new TextRun({ text: line, size: 24 })],
      spacing: { line: 360, after: 120 },
    }));
  });

  // Lösungs-Tabelle
  if (withSolutions && p.blanks?.length) {
    out.push(spacer(300));
    out.push(sectionHeading("Lösungen", BRAND_VIOLET));
    const rows = p.blanks.map((b, bi) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: BG_VIOLET_LIGHT, fill: BG_VIOLET_LIGHT },
            margins: { top: 100, bottom: 100, left: 200, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(bi + 1), bold: true, color: BRAND_VIOLET, size: 22 })],
              }),
            ],
          }),
          new TableCell({
            margins: { top: 100, bottom: 100, left: 100, right: 200 },
            children: [new Paragraph({ children: [new TextRun({ text: b.answers.join(" / "), color: TEXT_DARK })] })],
          }),
        ],
      }),
    );
    out.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "E9D5FF" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "F3E8FF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows,
    }));
  }
}

// ============ FLASHCARDS ============

function renderFlashcards(p: FlashcardPayload, out: any[], withSolutions: boolean) {
  if (!Array.isArray(p.cards)) return;
  out.push(sectionHeading("Karteikarten"));

  // 2-Spalten-Tabelle: Vorderseite | Rückseite
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Vorderseite", BRAND_SKY),
      headerCell("Rückseite", BRAND_VIOLET),
    ],
  });
  const rows = [
    headerRow,
    ...p.cards.map((c, ci) =>
      new TableRow({
        children: [
          bodyCell(c.front, BG_SLATE_LIGHT),
          bodyCell(withSolutions ? c.back : "(zum Selber-Antworten)", withSolutions ? "FFFFFF" : "FAFAF9"),
        ],
      }),
    ),
  ];
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "F1F5F9" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "F1F5F9" },
    },
    rows,
  }));
}

function headerCell(text: string, color: string) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color, fill: color },
    margins: { top: 140, bottom: 140, left: 200, right: 200 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22 })],
      }),
    ],
  });
}
function bodyCell(text: string, bg: string) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    children: [
      new Paragraph({ children: [new TextRun({ text, color: TEXT_DARK, size: 22 })] }),
    ],
  });
}

// ============ CASE STUDY ============

function renderCase(p: CasePayload, out: any[], withSolutions: boolean) {
  const intro = p.intro || p.situation;
  if (intro) {
    out.push(sectionHeading("Fall-Setup", BRAND_VIOLET));
    out.push(infoBox(intro, BG_VIOLET_LIGHT));
  }

  if (Array.isArray(p.steps) && p.steps.length > 0) {
    p.steps.forEach((s, si) => {
      out.push(sectionHeading(`Schritt ${si + 1}`));
      if (s.description?.trim()) {
        out.push(infoBox(s.description, BG_SLATE_LIGHT));
        out.push(spacer(120));
      }
      out.push(new Paragraph({
        children: [
          new TextRun({ text: "Frage: ", bold: true, color: BRAND_SKY, size: 24 }),
          new TextRun({ text: s.question, size: 24 }),
        ],
        spacing: { after: 160 },
      }));

      if (Array.isArray(s.options) && s.options.length > 0) {
        const rows = s.options.map((o, oi) => {
          const isCorrect = withSolutions && o.isCorrect;
          const isWrong = withSolutions && !o.isCorrect;
          const bg = isCorrect ? BG_GREEN_LIGHT : isWrong ? BG_ROSE_LIGHT : "FFFFFF";
          const cells = [
            new TableCell({
              width: { size: 500, type: WidthType.DXA },
              shading: { type: ShadingType.SOLID, color: bg, fill: bg },
              margins: { top: 100, bottom: 100, left: 160, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: isCorrect ? "✓" : isWrong ? "✗" : "○",
                    bold: true, size: 28,
                    color: isCorrect ? BG_GREEN_BORDER : isWrong ? "DC2626" : TEXT_LIGHT_GREY,
                  })],
                }),
              ],
            }),
            new TableCell({
              shading: { type: ShadingType.SOLID, color: bg, fill: bg },
              margins: { top: 100, bottom: 100, left: 100, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String.fromCharCode(65 + oi) + ") ",
                      bold: true, color: TEXT_GREY,
                    }),
                    new TextRun({ text: o.text, bold: isCorrect, color: TEXT_DARK }),
                  ],
                }),
                ...(withSolutions && o.feedback?.trim()
                  ? [new Paragraph({
                      spacing: { before: 60 },
                      children: [new TextRun({
                        text: "→ " + o.feedback,
                        italics: true, color: TEXT_GREY, size: 18,
                      })],
                    })]
                  : []),
              ],
            }),
          ];
          return new TableRow({ children: cells });
        });
        out.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "F1F5F9" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows,
        }));
      }
      out.push(spacer(200));
    });
  }

  if (Array.isArray(p.questions) && p.questions.length > 0) {
    p.questions.forEach((q, qi) => {
      out.push(sectionHeading(`Frage ${qi + 1}`));
      out.push(new Paragraph({ children: [new TextRun({ text: q.question, size: 24 })] }));
      if (withSolutions && q.sampleAnswer) {
        out.push(spacer(160));
        out.push(infoBox("Musterantwort: " + q.sampleAnswer, BG_GREEN_LIGHT));
      }
      out.push(spacer(200));
    });
  }
}
