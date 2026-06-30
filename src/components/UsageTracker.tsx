"use client";

import { useEffect } from "react";

/**
 * Unsichtbarer Nutzungs-Tracker: pingt 1×/Minute den Server, solange der Tab
 * sichtbar ist. Daraus entsteht die Nutzungsdauer in der Admin-Übersicht.
 * Bewusst minimal: keine Klicks, keine Seiten, keine Inhalte — nur "App offen".
 */
export function UsageTracker() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/usage/ping", { method: "POST" }).catch(() => {});
    };
    ping(); // sofort beim Laden
    const t = setInterval(ping, 60_000);
    return () => clearInterval(t);
  }, []);
  return null;
}
