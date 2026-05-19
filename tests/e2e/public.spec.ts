import { test, expect } from "@playwright/test";

/**
 * Öffentliche Seiten (ohne Login erreichbar).
 */
test.describe("Public pages", () => {
  test("Anleitung lädt + zeigt Demo-Zugang", async ({ page }) => {
    await page.goto("/anleitung");
    await expect(page.getByRole("heading", { name: /Was die App alles kann/i })).toBeVisible();
    await expect(page.getByText("lehrer@demo.test")).toBeVisible();
    await expect(page.getByText("DEMO01")).toBeVisible();
  });

  test("Login-Seite zeigt beide Tabs + Demo-Hinweis", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Lehrkraft/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Schüler:in/ })).toBeVisible();
    // Demo-Konten-Hinweis ist im Lehrkraft-Tab
    await expect(page.getByText(/lehrer@demo\.test/i)).toBeVisible();
  });

  test("Login-Seite mit ?code=DEMO01 schaltet auf Schüler-Tab + füllt Code", async ({ page }) => {
    await page.goto("/login?code=DEMO01");
    // Schüler-Tab muss aktiv sein → inviteCode-Feld muss da sein
    const codeField = page.locator("#inviteCode");
    await expect(codeField).toBeVisible();
    await expect(codeField).toHaveValue("DEMO01");
    // Name + PIN-Felder sind sichtbar
    await expect(page.locator("#displayName")).toBeVisible();
    await expect(page.locator("#pin")).toBeVisible();
  });
});
