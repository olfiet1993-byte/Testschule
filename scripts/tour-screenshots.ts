/**
 * Generiert Tour-Screenshots der wichtigsten Surfaces für die /tour-Seite.
 *
 * Voraussetzung: lokaler Server läuft auf http://localhost:3000 mit Demo-Daten
 * (lehrer@demo.test / demo1234, Klasse DEMO01 mit Beispiel-Aufgaben).
 *
 * Aufruf: npx tsx scripts/tour-screenshots.ts
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "public", "tour");
const DEMO01_CLASS = "puR31gs0RSaS";

async function shoot(page: any, file: string, options: { fullPage?: boolean } = {}) {
  const dest = path.join(OUT, file);
  await fs.mkdir(OUT, { recursive: true });
  await page.screenshot({ path: dest, fullPage: !!options.fullPage });
  console.log("✓", file);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ============ ÖFFENTLICHE SEITEN ============
  console.log("→ Public");
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "01-login.png");

  // QR-Pre-Fill
  await page.goto(`${BASE}/login?code=DEMO01`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "02-login-prefill.png");

  await page.goto(`${BASE}/anleitung`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "03-anleitung.png");

  // ============ SCHÜLER-SICHT ============
  console.log("→ Schüler");
  await page.goto(`${BASE}/login?code=DEMO01`);
  const studentTab = page.getByRole("button", { name: /Schüler/ });
  if (await studentTab.count()) await studentTab.click();
  await page.locator("#displayName").fill("Tour-Demo");
  await page.locator("#pin").fill("9999");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/sus/);
  await shoot(page, "10-sus-lernraum.png");

  await page.goto(`${BASE}/sus/aufgaben`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "11-sus-aufgaben.png");

  // Eine Quiz-Aufgabe öffnen
  const quizCard = page.locator("a").filter({ hasText: "Vitalwerte — Grundlagen" }).first();
  if (await quizCard.count()) {
    await quizCard.click();
    await page.waitForLoadState("networkidle");
    await shoot(page, "12-sus-quiz.png");
  }

  await page.goto(`${BASE}/sus/karteikarten`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "13-sus-karteikarten.png");

  await page.goto(`${BASE}/sus/fehlerbuch`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "14-sus-fehlerbuch.png");

  await page.goto(`${BASE}/sus/wochenplan`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "15-sus-wochenplan.png");

  await page.goto(`${BASE}/sus/vitalsim`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "16-sus-vitalsim.png");

  // Logout
  await ctx.clearCookies();

  // ============ LEHRER-SICHT ============
  console.log("→ Lehrer");
  await page.goto(`${BASE}/login`);
  await page.locator("#email").fill("lehrer@demo.test");
  await page.locator("#password").fill("demo1234");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState("networkidle");
  await shoot(page, "20-dashboard.png");

  await page.goto(`${BASE}/klassen`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "21-klassen.png");

  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}`);
  await page.waitForLoadState("networkidle");
  // Lass das QR-SVG laden
  await page.waitForTimeout(800);
  await shoot(page, "22-klasse-detail.png");

  await page.goto(`${BASE}/aufgaben`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "23-aufgaben.png");

  // Quiz-Editor mit Beispiel-Inhalt zeigen (neuer Editor)
  await page.goto(`${BASE}/aufgaben/neu?type=quiz`);
  await page.waitForLoadState("networkidle");
  await page.locator("#title").fill("Beispiel: Vitalwerte-Quiz");
  await page.locator("textarea").first().fill("Welcher Bereich gilt als normaler Ruhepuls?");
  const firstAnswer = page.locator('input[placeholder*="Antwort 1"]');
  if (await firstAnswer.count()) await firstAnswer.fill("60-100 bpm");
  await shoot(page, "24-quiz-editor.png", { fullPage: true });

  // Klassenzimmer-Panel mit kompletter Dashboard-Ansicht
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await shoot(page, "25-klassenzimmer-panel.png");

  // Statistik
  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}/statistik`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "26-statistik.png", { fullPage: true });

  // Karteikarten-Übersicht
  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}/karteikarten`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "27-karteikarten-overview.png");

  // Karteikarten-Druckansicht
  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}/karteikarten/print`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  await shoot(page, "28-karteikarten-druck.png");

  // Lernpfade
  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}/lernpfade`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "29-lernpfade.png");

  // Vital-Szenarien-Manager
  await page.goto(`${BASE}/klassen/${DEMO01_CLASS}/vitalsim`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "30-vital-szenarien.png");

  // Bibliothek mit AI-Buttons
  await page.goto(`${BASE}/bibliothek`);
  await page.waitForLoadState("networkidle");
  await shoot(page, "31-bibliothek.png");

  await browser.close();
  console.log("\n✅ Alle Screenshots in public/tour/");
}

main().catch((e) => { console.error(e); process.exit(1); });
