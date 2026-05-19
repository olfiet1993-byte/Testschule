"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb } from "lucide-react";

export function FeedbackFab() {
  const path = usePathname();
  // Auf /login und der Feedback-Seite selbst nicht anzeigen
  if (!path || path === "/login" || path.startsWith("/feedback")) return null;

  return (
    <Link
      href="/feedback"
      title="Idee oder Feedback einreichen"
      aria-label="Feedback einreichen"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 group inline-flex items-center gap-2 px-3 py-3 md:py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 transition"
    >
      <Lightbulb className="w-5 h-5" />
      <span className="hidden md:inline text-sm font-medium pr-1">Idee?</span>
    </Link>
  );
}
