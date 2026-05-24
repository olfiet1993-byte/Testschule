"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home, Users, BookOpen, Library, ClipboardList, LogOut, GraduationCap, User, MessageCircle, Building2, Mail, CalendarDays, History, Lightbulb, HelpCircle, Layers, BookX, Activity, Brain, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

const teacherNav = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/klassen", label: "Klassen & Gruppen", icon: Users },
  { href: "/bibliothek", label: "Inhalts-Bibliothek", icon: Library },
  { href: "/aufgaben", label: "Aufgaben", icon: ClipboardList },
  { href: "/austausch", label: "Austausch-Pool", icon: Share2 },
  { href: "/nachrichten", label: "Nachrichten", icon: Mail },
  { href: "/schule", label: "Schule & Kollegium", icon: Building2 },
  { href: "/profil", label: "Mein Profil", icon: User },
];

const studentNav = [
  { href: "/sus", label: "Mein Lernraum", icon: Home },
  { href: "/sus/aufgaben", label: "Aufgaben", icon: BookOpen },
  { href: "/sus/karteikarten", label: "Karteikarten", icon: Layers },
  { href: "/sus/fehlerbuch", label: "Fehlerbuch", icon: BookX },
  { href: "/sus/wochenplan", label: "Wochenplan", icon: CalendarDays },
  { href: "/sus/vitalsim", label: "Vitalwerte-Sim", icon: Activity },
  { href: "/sus/forum", label: "Forum", icon: MessageCircle },
  { href: "/nachrichten", label: "Nachrichten", icon: Mail },
  { href: "/profil", label: "Mein Profil", icon: User },
];

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const nav = role === "teacher" ? teacherNav : studentNav;

  return (
    <aside className="w-64 hidden md:flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200/70 dark:border-slate-800 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-200/70 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-brand-grad flex items-center justify-center shadow-md shadow-sky-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-brand-grad">Test Schule</div>
          <div className="text-[11px] text-slate-500 leading-tight">Pflegeausbildung</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative",
                active
                  ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sky-500 rounded-r-full" />}
              <Icon className={cn("w-4 h-4 transition-transform", active ? "scale-110" : "group-hover:scale-105")} />
              {item.label}
            </Link>
          );
        })}

        {/* Footer-Links */}
        <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-0.5">
          <Link
            href="/feedback"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              path?.startsWith("/feedback")
                ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <Lightbulb className="w-4 h-4" /> Ideen & Feedback
          </Link>
          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              path?.startsWith("/help") || path?.startsWith("/anleitung") || path?.startsWith("/tour")
                ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <HelpCircle className="w-4 h-4" /> Hilfe & Anleitung
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-end gap-1 mb-1">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <Link href="/profil" className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          {session?.user && (
            <Avatar
              user={{
                id: session.user.id,
                displayName: session.user.displayName,
                avatarEmoji: (session.user as any).avatarEmoji,
                avatarColor: (session.user as any).avatarColor,
              }}
              size={32}
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{session?.user?.displayName ?? "—"}</div>
            <div className="text-xs text-slate-500">{role === "teacher" ? "Lehrkraft" : "Schüler:in"}</div>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <LogOut className="w-4 h-4" /> Abmelden
        </button>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const { data: session } = useSession();
  const initials = (session?.user?.displayName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="md:hidden flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">Test Schule</div>
          <div className="text-[10px] text-slate-500 leading-tight">
            {session?.user?.role === "teacher" ? "Lehrkraft" : "Schüler:in"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Abmelden"
        >
          <span className="text-xs text-slate-600 dark:text-slate-300">{session?.user?.displayName}</span>
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
            {initials || "?"}
          </div>
        </button>
      </div>
    </div>
  );
}
