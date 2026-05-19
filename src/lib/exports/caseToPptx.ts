import PptxGenJS from "pptxgenjs";

type CasePayload = {
  intro?: string;
  situation?: string;
  steps?: Array<{
    description?: string;
    question: string;
    options?: Array<{ text: string; isCorrect: boolean; feedback?: string }>;
  }>;
};

type Task = {
  title: string;
  description?: string | null;
  payload: string;
  difficulty?: number | null;
};

const BRAND_BG = "0EA5E9";
const TEXT_DARK = "0F172A";
const TEXT_GREY = "475569";
const ACCENT_GREEN = "10B981";
const ACCENT_AMBER = "F59E0B";
const ACCENT_ROSE = "F43F5E";

/**
 * Wandelt eine Fallstudie in eine .pptx-Datei um.
 * Layout:
 *  - Folie 1: Titelfolie (Brand-Gradient)
 *  - Folie 2: Fall-Setup (Intro)
 *  - Folie 3..n: pro Schritt eine Folie mit Frage + Optionen
 *  - withSolutions: zeigt die richtige Option grün, Feedback darunter
 *  - Andernfalls: zeigt nur die Fragen + Optionen (zum Diskutieren)
 */
export async function caseToPptx(
  task: Task,
  options: { withSolutions: boolean; className?: string },
): Promise<Buffer> {
  const pres = new PptxGenJS();
  pres.author = "Test Schule";
  pres.title = task.title;
  pres.layout = "LAYOUT_WIDE"; // 16:9

  const payload = JSON.parse(task.payload) as CasePayload;

  // === Folie 1: Titel ===
  const title = pres.addSlide();
  title.background = { color: BRAND_BG };
  title.addText(task.title, {
    x: 0.5, y: 2.5, w: 12, h: 1.5,
    fontSize: 48, bold: true, color: "FFFFFF", align: "left",
  });
  const subline: string[] = [];
  if (options.className) subline.push(options.className);
  if (task.difficulty) subline.push(["leicht", "mittel", "schwer"][task.difficulty - 1]);
  subline.push("Fallstudie");
  title.addText(subline.join("  ·  "), {
    x: 0.5, y: 4.0, w: 12, h: 0.5,
    fontSize: 20, color: "DBEAFE", italic: true,
  });
  title.addText("Test Schule · Pflegeausbildung", {
    x: 0.5, y: 6.8, w: 12, h: 0.3,
    fontSize: 12, color: "BAE6FD",
  });

  // === Folie 2: Fall-Setup ===
  const intro = payload.intro || payload.situation;
  if (intro) {
    const slide = pres.addSlide();
    slide.background = { color: "F8FAFC" };
    slide.addText("Fall-Setup", {
      x: 0.5, y: 0.4, w: 12, h: 0.7,
      fontSize: 32, bold: true, color: TEXT_DARK,
    });
    slide.addShape(pres.ShapeType.line, {
      x: 0.5, y: 1.1, w: 12, h: 0,
      line: { color: BRAND_BG, width: 3 },
    });
    slide.addText(intro, {
      x: 0.5, y: 1.4, w: 12, h: 5.5,
      fontSize: 22, color: TEXT_DARK, valign: "top",
      paraSpaceAfter: 12,
    });
  }

  // === Folien pro Schritt ===
  const steps = payload.steps ?? [];
  steps.forEach((step, si) => {
    const slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };

    // Header
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.6,
      fill: { color: BRAND_BG }, line: { type: "none" },
    });
    slide.addText(`Schritt ${si + 1} von ${steps.length}`, {
      x: 0.5, y: 0.05, w: 12, h: 0.5,
      fontSize: 14, color: "FFFFFF", bold: true,
    });

    // Situation
    let yOffset = 1.0;
    if (step.description?.trim()) {
      slide.addText(step.description, {
        x: 0.5, y: yOffset, w: 12, h: 1.0,
        fontSize: 18, color: TEXT_GREY, italic: true,
        valign: "top",
      });
      yOffset += 1.1;
    }

    // Frage
    slide.addText(step.question, {
      x: 0.5, y: yOffset, w: 12, h: 0.8,
      fontSize: 26, bold: true, color: TEXT_DARK,
      valign: "top",
    });
    yOffset += 1.0;

    // Optionen
    if (Array.isArray(step.options)) {
      step.options.forEach((o, oi) => {
        const isCorrect = options.withSolutions && o.isCorrect;
        const isWrong = options.withSolutions && !o.isCorrect;
        const bg = isCorrect ? "D1FAE5" : isWrong ? "FEF2F2" : "F1F5F9";
        const borderColor = isCorrect ? ACCENT_GREEN : isWrong ? ACCENT_ROSE : "CBD5E1";
        const textColor = isCorrect ? "065F46" : isWrong ? "7F1D1D" : TEXT_DARK;

        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.5, y: yOffset, w: 12, h: 0.55,
          fill: { color: bg },
          line: { color: borderColor, width: 1.5 },
          rectRadius: 0.08,
        });
        const letter = String.fromCharCode(65 + oi);
        const prefix = isCorrect ? "✓ " : isWrong ? "✗ " : "";
        slide.addText(`${prefix}${letter})  ${o.text}`, {
          x: 0.7, y: yOffset + 0.05, w: 11.6, h: 0.45,
          fontSize: 16, color: textColor,
          bold: isCorrect, valign: "middle",
        });
        yOffset += 0.65;

        if (options.withSolutions && o.feedback?.trim()) {
          slide.addText("→ " + o.feedback, {
            x: 1.1, y: yOffset, w: 11, h: 0.4,
            fontSize: 12, color: TEXT_GREY, italic: true,
            valign: "middle",
          });
          yOffset += 0.45;
        }
      });
    }
  });

  // === Schlussfolie ===
  const close = pres.addSlide();
  close.background = { color: BRAND_BG };
  close.addText("Diskussion · Reflexion · Transfer", {
    x: 0.5, y: 3.0, w: 12, h: 1.5,
    fontSize: 36, bold: true, color: "FFFFFF",
  });
  close.addText("Was nehmt ihr aus dem Fall mit?", {
    x: 0.5, y: 4.5, w: 12, h: 0.6,
    fontSize: 22, color: "DBEAFE", italic: true,
  });

  const data = await pres.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
