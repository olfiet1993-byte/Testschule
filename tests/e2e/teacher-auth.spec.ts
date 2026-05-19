import { test, expect } from "@playwright/test";

/**
 * Lehrer-Login + Klassenzimmer-Panel-Sichtbarkeit.
 */
test.describe("Lehrer-Auth", () => {
  test("Demo-Login → Dashboard + Klassenzimmer-Panel", async ({ page }) => {
    await page.goto("/login");

    // Lehrkraft-Tab ist Default
    await page.locator("#email").fill("lehrer@demo.test");
    await page.locator("#password").fill("demo1234");
    await page.locator("form button[type=submit]").click();

    // Landet auf Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Willkommen, Frau Demo/ })).toBeVisible();

    // Klassenzimmer-Panel ist sichtbar (xl-Breakpoint — Playwright nutzt Desktop Chrome ≥1280px)
    await expect(page.getByRole("heading", { name: "Klassenzimmer", level: 2 })).toBeVisible();

    // Klassen-Karte zeigt Pflege Demo 24
    await expect(page.getByText("Pflege Demo 24").first()).toBeVisible();
  });

  test("Klassen-Seite zeigt QR-Code + Code DEMO01", async ({ page }) => {
    // Erst einloggen (kein Session-Sharing zwischen Tests)
    await page.goto("/login");
    await page.locator("#email").fill("lehrer@demo.test");
    await page.locator("#password").fill("demo1234");
    await page.locator("form button[type=submit]").click();
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });

    // Auf Klasse navigieren (Hauptkarte, nicht Klassenzimmer-Panel)
    await page.getByRole("link", { name: /Pflege Demo 24/ }).first().click();
    await expect(page).toHaveURL(/\/klassen\//);

    // QR-Card ist sichtbar mit DEMO01
    await expect(page.getByRole("heading", { name: /Schüler:innen-Beitritt/ })).toBeVisible();
    await expect(page.getByText("DEMO01", { exact: true }).first()).toBeVisible();
  });
});
