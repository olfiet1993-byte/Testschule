"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Users, Library, ClipboardList, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const teacherTabs = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/klassen", label: "Klassen", icon: Users },
  { href: "/bibliothek", label: "Inhalte", icon: Library },
  { href: "/aufgaben", label: "Aufgaben", icon: ClipboardList },
];

const studentTabs = [
  { href: "/sus", label: "Start", icon: Home },
  { href: "/sus/aufgaben", label: "Aufgaben", icon: BookOpen },
];

export function MobileTabBar() {
  const path = usePathname();
  const { data: session } = useSession();
  const tabs = session?.user?.role === "teacher" ? teacherTabs : studentTabs;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active =
            path === tab.href ||
            (tab.href !== "/dashboard" && tab.href !== "/sus" && path.startsWith(tab.href));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition",
                active
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "scale-110")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
