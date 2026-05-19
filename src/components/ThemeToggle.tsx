"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "testschule-theme";

function applyTheme(t: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = t === "dark" || (t === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);
    // System-Change beobachten
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem(STORAGE_KEY) as Theme | null) === "system") {
        applyTheme("system");
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  function set(t: Theme) {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const label: Record<Theme, string> = {
    light: "Hell · klick für Dunkel",
    dark: "Dunkel · klick für System",
    system: "System · klick für Hell",
  };
  return (
    <button
      onClick={() => set(next[theme])}
      title={label[theme]}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/**
 * Anti-FOUC-Script — sollte als allerstes im <head> laufen, damit der Mode
 * gesetzt wird BEVOR React rendert.
 */
export const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = t === 'dark' || (t === 'system' && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch(e) {}
})();
`;
