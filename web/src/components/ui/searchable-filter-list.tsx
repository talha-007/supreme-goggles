"use client";

import { useMemo, useState } from "react";

export type SearchableFilterItem = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  items: SearchableFilterItem[];
  value: string;
  onChange: (key: string) => void;
  searchPlaceholder: string;
  noMatchesLabel: string;
  variant: "blue" | "violet";
};

export function SearchableFilterList({
  items,
  value,
  onChange,
  searchPlaceholder,
  noMatchesLabel,
  variant,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const sq = q.trim().toLowerCase();
    if (!sq) return items;
    const all = items.find((i) => i.key === "all");
    const rest = items.filter(
      (i) =>
        i.key !== "all" &&
        (i.label.toLowerCase().includes(sq) || i.key.toLowerCase().includes(sq)),
    );
    return all ? [all, ...rest] : rest;
  }, [items, q]);

  const activeBlue =
    "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100";
  const activeViolet =
    "bg-violet-50 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100";
  const activeClass = variant === "blue" ? activeBlue : activeViolet;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
        autoComplete="off"
        aria-label={searchPlaceholder}
        className="min-h-[36px] w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 outline-none ring-zinc-400/30 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      <div className="max-h-44 overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-zinc-50/90 shadow-inner dark:border-zinc-800 dark:bg-zinc-950/80">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">{noMatchesLabel}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((item) => {
              const isActive = value === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.key);
                      setQ("");
                    }}
                    className={`flex w-full min-h-[40px] touch-manipulation items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-medium transition active:scale-[0.99] ${
                      isActive
                        ? activeClass
                        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="shrink-0 tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                      {item.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
