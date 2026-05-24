"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown, Search, Sparkles, GraduationCap, ClipboardList,
  Layers, Send, TrendingUp, Activity, Shield, MonitorSmartphone,
} from "lucide-react";

export type FaqItem = {
  q: string;
  a: string;
  /** Kontext-Tags zum Filtern */
  tags?: string[];
};

export type FaqCategory = {
  id: string;
  title: string;
  /** Icon als String-Name (Server kann keine Funktionen ans Client übergeben) */
  icon: string;
  color: string;
  items: FaqItem[];
};

const ICONS: Record<string, any> = {
  GraduationCap, ClipboardList, Layers, Send, TrendingUp,
  Activity, Shield, MonitorSmartphone,
};

export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const [filter, setFilter] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!filter.trim()) return categories;
    const q = filter.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q) ||
            item.tags?.some((t) => t.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, filter]);

  function toggle(key: string) {
    setOpenItems((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalCount = categories.reduce((a, c) => a + c.items.length, 0);
  const filteredCount = filtered.reduce((a, c) => a + c.items.length, 0);

  return (
    <div>
      {/* Such-Bar */}
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={`In ${totalCount} Fragen suchen…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base focus:outline-none focus:border-sky-500 transition"
        />
        {filter && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {filteredCount} Treffer
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Sparkles className="w-10 h-10 mx-auto mb-2" />
          Keine Treffer. Versuch andere Stichworte.
        </div>
      )}

      {/* Kategorien */}
      <div className="space-y-10">
        {filtered.map((cat) => {
          const Icon = ICONS[cat.icon] ?? Sparkles;
          return (
            <section key={cat.id}>
              <h2 className="flex items-center gap-2 mb-4 text-xl font-bold">
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-white`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {cat.title}
              </h2>
              <div className="space-y-2">
                {cat.items.map((item, i) => {
                  const key = `${cat.id}-${i}`;
                  const open = openItems.has(key) || !!filter;
                  return (
                    <div
                      key={key}
                      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="w-full px-5 py-4 text-left flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                      >
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                        <span className="font-semibold flex-1">{item.q}</span>
                      </button>
                      {open && (
                        <div className="px-5 pb-5 pl-12 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
