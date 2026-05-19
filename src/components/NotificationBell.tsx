"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { markAllRead, markNotificationRead } from "@/lib/actions/notifications-actions";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "gerade eben";
  if (sec < 3600) return `vor ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `vor ${Math.floor(sec / 3600)} h`;
  return `vor ${Math.floor(sec / 86400)} T`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ }
  }

  // Initial laden + Polling alle 30 s
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Click outside zum Schließen
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
        title="Benachrichtigungen"
      >
        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-30">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
            <span className="font-semibold text-sm">Benachrichtigungen</span>
            {unread > 0 && (
              <button
                onClick={() => start(async () => { await markAllRead(); setItems((xs) => xs.map((x) => ({ ...x, readAt: new Date() }))); })}
                disabled={pending}
                className="text-xs text-sky-600 hover:underline"
              >
                Alle gelesen
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Keine Benachrichtigungen.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.slice(0, 20).map((n) => {
                const unreadItem = !n.readAt;
                const content = (
                  <div className={`p-3 ${unreadItem ? "bg-sky-50/50 dark:bg-sky-900/20" : ""} hover:bg-slate-50 dark:hover:bg-slate-800 transition`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${unreadItem ? "bg-sky-500" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
                        <div className="text-[10px] text-slate-400 mt-1">{timeAgo(new Date(n.createdAt))}</div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setOpen(false);
                          if (unreadItem) start(async () => { await markNotificationRead(n.id); });
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        className="w-full text-left"
                        onClick={() => {
                          if (unreadItem) start(async () => { await markNotificationRead(n.id); setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, readAt: new Date() } : x)); });
                        }}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
