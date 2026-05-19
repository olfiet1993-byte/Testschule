/**
 * Minimaler CSV-Parser ohne Dependency.
 * Unterstützt:
 * - Semikolon (DE-Excel-Standard) oder Komma als Trennzeichen — Auto-Detect
 * - Quoted Strings mit "" Escaping
 * - CRLF / LF Zeilenenden
 */

export function parseCSV(text: string): string[][] {
  // Auto-Detect Separator: zähle ; vs , in der ersten Zeile
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        current.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        // Zeilenende
        if (c === "\r" && next === "\n") i++;
        current.push(field);
        if (current.some((f) => f.trim())) rows.push(current);
        current = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.some((f) => f.trim())) rows.push(current);
  }
  return rows;
}

export type FlashcardImport = { front: string; back: string };

export function parseFlashcardCSV(text: string): { cards: FlashcardImport[]; warnings: string[] } {
  const rows = parseCSV(text);
  const warnings: string[] = [];
  const cards: FlashcardImport[] = [];

  // Erste Zeile evtl. Header
  let startIdx = 0;
  if (rows.length > 0) {
    const first = rows[0].map((c) => c.toLowerCase().trim());
    if (first.includes("vorderseite") || first.includes("front") || first.includes("frage")) startIdx = 1;
  }

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 2) {
      warnings.push(`Zeile ${i + 1}: zu wenige Spalten (mindestens 2 nötig)`);
      continue;
    }
    const front = r[0]?.trim();
    const back = r[1]?.trim();
    if (!front || !back) {
      warnings.push(`Zeile ${i + 1}: Vorder- oder Rückseite leer`);
      continue;
    }
    cards.push({ front, back });
  }
  return { cards, warnings };
}

export type QuizImport = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export function parseQuizCSV(text: string): { questions: QuizImport[]; warnings: string[] } {
  const rows = parseCSV(text);
  const warnings: string[] = [];
  const questions: QuizImport[] = [];

  let startIdx = 0;
  if (rows.length > 0) {
    const first = rows[0].map((c) => c.toLowerCase().trim());
    if (first.includes("frage") || first.includes("question")) startIdx = 1;
  }

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    // Spalten: Frage, Antwort1..N, Richtig(1-N), [Erklärung]
    if (r.length < 4) {
      warnings.push(`Zeile ${i + 1}: braucht mindestens Frage + 2 Antworten + Richtig-Spalte`);
      continue;
    }
    const question = r[0]?.trim();
    if (!question) { warnings.push(`Zeile ${i + 1}: keine Frage`); continue; }

    // Letzte oder vorletzte Spalte ist "Richtig" (Zahl)
    let correctIdx = -1;
    let correctCol = -1;
    let explanation: string | undefined;
    // Suche von hinten: erste Zahl-Zelle ist "Richtig"
    for (let j = r.length - 1; j > 0; j--) {
      const v = r[j]?.trim();
      if (v && /^\d+$/.test(v)) {
        correctIdx = parseInt(v, 10) - 1;
        correctCol = j;
        // Spalten nach correctCol sind die Erklärung
        if (j < r.length - 1) explanation = r.slice(j + 1).filter(Boolean).join(" ").trim() || undefined;
        break;
      }
    }
    if (correctCol < 0) {
      warnings.push(`Zeile ${i + 1}: keine 'Richtig'-Spalte (1..N) gefunden`);
      continue;
    }

    const options = r.slice(1, correctCol).map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      warnings.push(`Zeile ${i + 1}: weniger als 2 Antworten`);
      continue;
    }
    if (correctIdx < 0 || correctIdx >= options.length) {
      warnings.push(`Zeile ${i + 1}: Richtig-Index ${correctIdx + 1} außerhalb (1..${options.length})`);
      continue;
    }

    questions.push({ question, options, correctIndex: correctIdx, explanation });
  }

  return { questions, warnings };
}
