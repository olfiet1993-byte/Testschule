import ExcelJS from "exceljs";

type Member = {
  id: string;
  displayName: string;
  xp: number;
  level: number;
};

type Task = {
  id: string;
  title: string;
  type: string;
  topicId?: string | null;
  difficulty?: number | null;
};

type Topic = {
  id: string;
  title: string;
};

type Score = {
  userId: string;
  taskId: string;
  scorePct: number | null;
};

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0EA5E9" } } as any;
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } } as any;

/**
 * Erzeugt eine Excel-Datei mit drei Sheets:
 * 1. „Notenliste": Schüler × Aufgaben, mit Ø-Spalte und Note
 * 2. „Themen-Mastery": Schüler × Themen (% pro Thema)
 * 3. „Aufgaben-Statistik": pro Aufgabe Ø, Min, Max, Anzahl Abgaben
 */
export async function classStatsToXlsx(input: {
  className: string;
  members: Member[];
  tasks: Task[];
  topics: Topic[];
  scores: Score[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Test Schule";
  wb.created = new Date();

  // Lookup-Tabellen
  const scoreMap: Record<string, Record<string, number>> = {};
  for (const s of input.scores) {
    if (s.scorePct == null) continue;
    if (!scoreMap[s.userId]) scoreMap[s.userId] = {};
    scoreMap[s.userId][s.taskId] = s.scorePct;
  }

  // ============ Sheet 1: Notenliste ============
  const noten = wb.addWorksheet("Notenliste");
  // Header-Row
  const header1 = ["Schüler:in", ...input.tasks.map((t) => t.title), "Ø %", "Note"];
  const row1 = noten.addRow(header1);
  row1.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  noten.getRow(1).height = 60;

  input.members.forEach((m) => {
    const cells: any[] = [m.displayName];
    const pcts: number[] = [];
    for (const t of input.tasks) {
      const pct = scoreMap[m.id]?.[t.id];
      if (pct != null) {
        cells.push(Math.round(pct));
        pcts.push(pct);
      } else {
        cells.push("–");
      }
    }
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
    cells.push(avg != null ? Math.round(avg) : "–");
    cells.push(avg != null ? germanGrade(avg) : "–");
    const row = noten.addRow(cells);
    // Farbcodierung für Score-Zellen (Spalte 2 bis tasks+1)
    for (let i = 0; i < input.tasks.length; i++) {
      const c = row.getCell(i + 2);
      const v = c.value;
      if (typeof v === "number") {
        c.fill = colorForScore(v);
        c.alignment = { horizontal: "center" };
      } else {
        c.alignment = { horizontal: "center" };
      }
    }
    // Ø + Note Bold
    row.getCell(cells.length - 1).font = { bold: true };
    row.getCell(cells.length).font = { bold: true };
  });

  // Spaltenbreiten
  noten.getColumn(1).width = 24;
  for (let i = 0; i < input.tasks.length; i++) noten.getColumn(i + 2).width = 14;
  noten.getColumn(input.tasks.length + 2).width = 8;
  noten.getColumn(input.tasks.length + 3).width = 6;
  noten.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  // ============ Sheet 2: Themen-Mastery ============
  const mastery = wb.addWorksheet("Themen-Mastery");
  const masteryHeader = ["Schüler:in", ...input.topics.map((t) => t.title), "Ø %"];
  const mRow1 = mastery.addRow(masteryHeader);
  mRow1.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  mastery.getRow(1).height = 40;

  input.members.forEach((m) => {
    const cells: any[] = [m.displayName];
    const pcts: number[] = [];
    for (const topic of input.topics) {
      const topicTaskIds = input.tasks.filter((t) => t.topicId === topic.id).map((t) => t.id);
      const scores = topicTaskIds.map((tid) => scoreMap[m.id]?.[tid]).filter((p): p is number => p != null);
      if (scores.length === 0) {
        cells.push("–");
      } else {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        cells.push(Math.round(avg));
        pcts.push(avg);
      }
    }
    const overall = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    cells.push(overall ?? "–");
    const row = mastery.addRow(cells);
    for (let i = 0; i < input.topics.length; i++) {
      const c = row.getCell(i + 2);
      if (typeof c.value === "number") {
        c.fill = colorForScore(c.value as number);
        c.alignment = { horizontal: "center" };
      }
    }
    row.getCell(cells.length).font = { bold: true };
  });

  mastery.getColumn(1).width = 24;
  for (let i = 0; i < input.topics.length; i++) mastery.getColumn(i + 2).width = 14;
  mastery.getColumn(input.topics.length + 2).width = 10;
  mastery.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

  // ============ Sheet 3: Aufgaben-Statistik ============
  const taskStat = wb.addWorksheet("Aufgaben-Statistik");
  const tsHeader = ["Aufgabe", "Typ", "Schwierigkeit", "Abgaben", "Ø %", "Min %", "Max %"];
  const tsRow1 = taskStat.addRow(tsHeader);
  tsRow1.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  for (const task of input.tasks) {
    const scores = input.members
      .map((m) => scoreMap[m.id]?.[task.id])
      .filter((p): p is number => p != null);
    const row = taskStat.addRow([
      task.title,
      task.type,
      task.difficulty ? ["leicht", "mittel", "schwer"][task.difficulty - 1] : "–",
      scores.length,
      scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "–",
      scores.length ? Math.round(Math.min(...scores)) : "–",
      scores.length ? Math.round(Math.max(...scores)) : "–",
    ]);
    row.getCell(5).font = { bold: true };
  }

  taskStat.getColumn(1).width = 36;
  taskStat.getColumn(2).width = 14;
  taskStat.getColumn(3).width = 14;
  for (let i = 4; i <= 7; i++) taskStat.getColumn(i).width = 10;

  // Erste Zeile als Header in allen Sheets
  for (const sheet of [noten, mastery, taskStat]) {
    sheet.getRow(1).font = HEADER_FONT;
  }

  // Header-Section oben drüber (Klassenname + Datum) — wir prependen vor Sheet 1
  noten.spliceRows(1, 0, [`Notenliste — ${input.className}`]);
  noten.mergeCells(1, 1, 1, input.tasks.length + 3);
  noten.getCell(1, 1).font = { bold: true, size: 14 };
  noten.getCell(1, 1).alignment = { horizontal: "left" };
  noten.spliceRows(2, 0, [`Stand: ${new Date().toLocaleDateString("de-DE")} · ${input.members.length} Schüler:innen · ${input.tasks.length} Aufgaben`]);
  noten.mergeCells(2, 1, 2, input.tasks.length + 3);
  noten.getCell(2, 1).font = { italic: true, color: { argb: "FF666666" } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function germanGrade(pct: number): string {
  if (pct >= 92) return "1";
  if (pct >= 81) return "2";
  if (pct >= 67) return "3";
  if (pct >= 50) return "4";
  if (pct >= 30) return "5";
  return "6";
}

function colorForScore(pct: number): any {
  let argb = "FFE2E8F0"; // slate-200 default
  if (pct >= 90) argb = "FFD1FAE5"; // emerald-100
  else if (pct >= 70) argb = "FFA7F3D0"; // emerald-200
  else if (pct >= 50) argb = "FFFEF3C7"; // amber-100
  else argb = "FFFECACA"; // rose-200
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
