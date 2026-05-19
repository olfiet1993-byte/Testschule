"use client";

import { useEffect, useState } from "react";

/**
 * Reines CSS-Konfetti — keine externe Library.
 * Spielt eine kurze Konfetti-Animation, dann unmount.
 */
export function Confetti({ trigger, durationMs = 3000 }: { trigger: boolean; durationMs?: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setActive(true);
      const t = setTimeout(() => setActive(false), durationMs);
      return () => clearTimeout(t);
    }
  }, [trigger, durationMs]);

  if (!active) return null;

  const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];
  const pieces = Array.from({ length: 60 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 2 + Math.random() * 1.5;
    const color = colors[i % colors.length];
    const size = 6 + Math.random() * 6;
    const rotate = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 80;
    return (
      <span
        key={i}
        style={{
          left: `${left}%`,
          top: "-20px",
          width: size,
          height: size * 1.4,
          background: color,
          animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
          transform: `rotate(${rotate}deg)`,
          ["--drift" as any]: `${drift}px`,
        }}
        className="absolute rounded-sm pointer-events-none"
      />
    );
  });

  return (
    <>
      <style jsx global>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift, 0), 100vh, 0) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
        {pieces}
      </div>
    </>
  );
}
