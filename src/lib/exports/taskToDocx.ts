import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
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
    question: string;
    description?: string;
    options?: Array<{ text: string; isCorrect: boolean; feedback?: string }>;
    sampleAnswer?: string;
  }>;
  questions?: Array<{ question: string; sampleAnswer?: string }>;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  type: "quiz" | "cloze" | "flashcards" | "case_study" | "image_hotspot";
  payload: string; // JSON
  xpReward?: number;
  difficulty?: number | null;
};

const DIFFICULTY = { 1: "leicht", 2: "mittel", 3: "schwer" } as const;

/**
 * Wandelt eine Aufgabe in ein .docx-Buffer (Word) um.
 * `withSolutions`: ob die richtigen Antworten + Erklärungen mit aufgeführt werden.
 */
export async function taskToDocx(
  task: Task,
  options: { withSolutions: boolean; className?: string },
): Promise<Buffer> {
  const payload = JSON.parse(task.payload);
  const children: any[] = [];

  // Titel
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: task.title, bold: true })],
    }),
  );

  // Meta-Zeile
  const metaParts: string[] = [];
  if (options.className) metaParts.push(options.className);
  if (task.difficulty && DIFFICULTY[task.difficulty as 1 | 2 | 3]) {
    metaParts.push("Schwierigkeit: " + DIFFICULTY[task.difficulty as 1 | 2 | 3]);
  }
  if (task.xpReward) metaParts.push(task.xpReward + " XP");
  if (metaParts.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: metaParts.join(" · "), italics: true, color: "666666" })],
        spacing: { after: 200 },
      }),
    );
  }

  // Beschreibung
  if (task.description?.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun(task.description)],
        spacing: { after: 200 },
      }),
    );
  }

  // Trenner
  children.push(blankLine());

  // Typ-spezifisch
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

  // Footer-Hinweis
  children.push(blankLine());
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: "Test Schule · " + new Date().toLocaleDateString("de-DE"),
          italics: true,
          size: 18,
          color: "999999",
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "Test Schule",
    title: task.title,
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

function blankLine() {
  return new Paragraph({ children: [new TextRun("")] });
}

function renderQuiz(p: QuizPayload, out: any[], withSolutions: boolean) {
  if (!Array.isArray(p.questions)) return;
  p.questions.forEach((q, qi) => {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `Frage ${qi + 1}`, bold: true })],
      }),
    );
    out.push(new Paragraph({ children: [new TextRun(q.question)] }));
    q.options.forEach((opt, oi) => {
      const isCorrect = oi === q.correctIndex;
      const marker = withSolutions && isCorrect ? "☒" : "☐";
      const text = String.fromCharCode(65 + oi) + ") " + opt;
      out.push(
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({ text: `${marker}  ` }),
            new TextRun({
              text,
              bold: withSolutions && isCorrect,
            }),
          ],
        }),
      );
    });
    if (withSolutions && q.explanation?.trim()) {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({ text: "💡 ", color: "8b5cf6" }),
            new TextRun({ text: q.explanation, italics: true, color: "555555" }),
          ],
        }),
      );
    }
    out.push(blankLine());
  });
}

function renderCloze(p: ClozePayload, out: any[], withSolutions: boolean) {
  if (!p.text) return;
  // Lücken im Text ersetzen
  let i = 0;
  const text = p.text.replace(/\{\{[^}]*\}\}/g, () => {
    const ans = p.blanks?.[i]?.answers?.[0] ?? "";
    const replacement = withSolutions ? `__${ans}__` : "________";
    i++;
    return replacement;
  });
  // Absätze
  text.split(/\n+/).forEach((line) => {
    if (!line.trim()) return;
    out.push(new Paragraph({ children: [new TextRun(line)] }));
  });
  if (withSolutions && p.blanks?.length) {
    out.push(blankLine());
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Lösungen", bold: true })],
      }),
    );
    p.blanks.forEach((b, bi) => {
      out.push(
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({ text: `${bi + 1}. `, bold: true }),
            new TextRun({ text: b.answers.join(" / ") }),
          ],
        }),
      );
    });
  }
}

function renderFlashcards(p: FlashcardPayload, out: any[], withSolutions: boolean) {
  if (!Array.isArray(p.cards)) return;
  p.cards.forEach((c, ci) => {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `Karte ${ci + 1}`, bold: true })],
      }),
    );
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Vorderseite: ", bold: true }),
          new TextRun(c.front),
        ],
      }),
    );
    if (withSolutions) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Rückseite: ", bold: true }),
            new TextRun(c.back),
          ],
        }),
      );
    } else {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: "Rückseite: ____________________" })],
        }),
      );
    }
    out.push(blankLine());
  });
}

function renderCase(p: CasePayload, out: any[], withSolutions: boolean) {
  const intro = p.intro || p.situation;
  if (intro) {
    out.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Fall-Setup", bold: true })],
      }),
    );
    out.push(new Paragraph({ children: [new TextRun(intro)] }));
    out.push(blankLine());
  }

  // Schritt-basierte Fallstudie (neuere Variante)
  if (Array.isArray(p.steps) && p.steps.length > 0) {
    p.steps.forEach((s, si) => {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `Schritt ${si + 1}`, bold: true })],
        }),
      );
      if (s.description?.trim()) {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: s.description, italics: true })],
          }),
        );
      }
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Frage: ", bold: true }),
            new TextRun(s.question),
          ],
        }),
      );
      if (Array.isArray(s.options)) {
        s.options.forEach((o, oi) => {
          const marker = withSolutions && o.isCorrect ? "☒" : "☐";
          out.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({ text: `${marker}  ` }),
                new TextRun({ text: o.text, bold: withSolutions && o.isCorrect }),
              ],
            }),
          );
          if (withSolutions && o.feedback?.trim()) {
            out.push(
              new Paragraph({
                indent: { left: 720 },
                children: [
                  new TextRun({
                    text: "→ " + o.feedback,
                    italics: true,
                    color: "666666",
                  }),
                ],
              }),
            );
          }
        });
      }
      out.push(blankLine());
    });
  }

  // Alte Variante (questions + sampleAnswer)
  if (Array.isArray(p.questions) && p.questions.length > 0) {
    p.questions.forEach((q, qi) => {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `Frage ${qi + 1}`, bold: true })],
        }),
      );
      out.push(new Paragraph({ children: [new TextRun(q.question)] }));
      if (withSolutions && q.sampleAnswer) {
        out.push(blankLine());
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Musterantwort: ", bold: true }),
              new TextRun({ text: q.sampleAnswer, italics: true }),
            ],
          }),
        );
      } else {
        out.push(
          new Paragraph({ children: [new TextRun({ text: "Deine Antwort:" })] }),
        );
        for (let i = 0; i < 4; i++) {
          out.push(
            new Paragraph({ children: [new TextRun({ text: "_______________________________" })] }),
          );
        }
      }
      out.push(blankLine());
    });
  }
}
