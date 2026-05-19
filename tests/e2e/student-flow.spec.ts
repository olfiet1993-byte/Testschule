import { test, expect } from "@playwright/test";

/**
 * Schüler:in tritt einer Klasse bei (Code DEMO01) und navigiert
 * durch ihre wichtigsten Bereiche.
 */
test.describe("Schüler-Flow", () => {
  test("Beitritt via DEMO01 → Lernraum → Karteikarten + Vitalwerte-Sim", async ({ page }) => {
    // Schüler-Tab + Code-Vorbefüllung
    await page.goto("/login?code=DEMO01");
    await expect(page.locator("#inviteCode")).toHaveValue("DEMO01");

    // Eindeutiger Name pro Run + PIN
    const name = "E2E " + Math.random().toString(36).slice(2, 6);
    await page.locator("#displayName").fill(name);
    await page.locator("#pin").fill("1234");
    await page.locator("form button[type=submit]").click();

    // Landet im Schüler-Lernraum
    await expect(page).toHaveURL(/\/sus/);
    await expect(page.getByText(name).first()).toBeVisible();

    // Karteikarten-Trainer aufrufen — Empty-State (noch keine Karten in Demo-Klasse)
    await page.goto("/sus/karteikarten");
    await expect(page.getByRole("heading", { name: /Karteikarten-Trainer/ })).toBeVisible();

    // Vitalwerte-Sim — initial-Patient muss da sein
    await page.goto("/sus/vitalsim");
    await expect(page.getByRole("heading", { name: /Vitalwerte-Simulator/ })).toBeVisible();
    // Mindestens ein Vital-Wert (Puls) ist als Knopf sichtbar
    await expect(page.getByText("Puls", { exact: true })).toBeVisible();
  });
});
