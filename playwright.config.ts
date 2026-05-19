import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Konfiguration für End-to-End-Smoke-Tests.
 *
 * Strategie:
 * - Tests laufen gegen die echte App (next start auf Port 3000)
 * - Test-DB wird vor jedem Run über `DATABASE_URL=./data/e2e.db` separat gehalten,
 *   damit nichts in der „echten" Entwicklungs-DB landet
 * - Vor dem Run: `globalSetup` legt die Test-DB an und seedet Demo-Daten
 * - Sequenziell (1 Worker), weil Tests sich Daten teilen
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Globaler Setup entfällt — die Pipeline läuft jetzt deterministisch im webServer-Command.

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Bewusst > 1280px, damit `xl:`-Klassen (z. B. Klassenzimmer-Panel) sichtbar sind
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    // Pipeline in einem einzigen Shell-Aufruf — garantiert Reihenfolge:
    //  1. alte Test-DB löschen
    //  2. Schema pushen
    //  3. Demo-Daten seeden
    //  4. erst dann Next.js starten
    // Vorteil: Server kann unmöglich vor fertiger DB Anfragen beantworten.
    command:
      "DATABASE_URL=./data/e2e.db AUTH_SECRET=e2e_secret_64_hex_chars_for_testing_only_xxxxxxxxxxxxxxxxxxx AUTH_TRUST_HOST=true sh -c 'rm -f data/e2e.db && npx drizzle-kit push && npx tsx scripts/seed-demo.ts && npm run start'",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
