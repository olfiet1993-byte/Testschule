import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // ── Sicherheit ────────────────────────────────────────────────────
      "no-eval": "error",
      "no-implied-eval": "error",

      // ── Codequalität ──────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-unused-vars": "off",                    // TS-Version übernimmt
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "error",
      "no-var": "error",

      // ── React ─────────────────────────────────────────────────────────
      "react/no-danger": "error",                 // kein dangerouslySetInnerHTML
      "react-hooks/exhaustive-deps": "warn",

      // ── Next.js ───────────────────────────────────────────────────────
      "@next/next/no-html-link-for-pages": "error",
    },
  },
  {
    // Skripte und Konfigurationen lockerer behandeln
    files: ["scripts/**", "drizzle/**", "*.config.*"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
