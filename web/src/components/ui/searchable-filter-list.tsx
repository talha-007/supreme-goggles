"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  /** Short label shown next to the control (e.g. "Categories"). */
  groupLabel: string;
  /** `inline`: compact row for POS header (label screen-reader only). */
  layout?: "default" | "inline";
  /** Where the popover anchors when `layout="inline"` (avoids clipping at edges). */
  popoverAlign?: "start" | "end";
};

/**
 * Compact filter: one button shows the current choice; search + list only in a popover.
 */
export function SearchableFilterList({
  items,
  value,
  onChange,
  searchPlaceholder,
  noMatchesLabel,
  variant,
  groupLabel,
  layout = "default",
  popoverAlign = "start",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchId = useId();

  const selected = useMemo(
    () => items.find((i) => i.key === value) ?? items.find((i) => i.key === "all") ?? items[0],
    [items, value],
  );

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

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ring =
    variant === "blue"
      ? "border-blue-400/80 bg-blue-50/90 text-blue-950 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-50"
      : "border-violet-400/80 bg-violet-50/90 text-violet-950 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-50";
  const idle =
    variant === "blue"
      ? "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50";

  const activeRow =
    variant === "blue"
      ? "bg-blue-50 text-blue-950 dark:bg-blue-950/45 dark:text-blue-50"
      : "bg-violet-50 text-violet-950 dark:bg-violet-950/45 dark:text-violet-50";

  const isInline = layout === "inline";
  const popoverPosition =
    popoverAlign === "end"
      ? "right-0 left-auto w-[min(18rem,calc(100vw-1.5rem))]"
      : "left-0 right-auto w-[min(18rem,calc(100vw-1.5rem))]";

  const buttonLabel = `${groupLabel}: ${selected?.label ?? "—"} (${selected?.count ?? 0})`;

  return (
    <div ref={rootRef} className={`relative min-w-0 flex-1 overflow-visible ${isInline ? "max-w-[14rem]" : ""}`}>
      <div
        className={
          isInline
            ? "flex min-w-0 items-center gap-1.5"
            : "flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2"
        }
      >
        <span className={isInline ? "sr-only" : "shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"}>
          {groupLabel}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? searchId : undefined}
          aria-label={isInline ? buttonLabel : undefined}
          title={isInline ? buttonLabel : undefined}
          onClick={() => {
            setOpen((o) => !o);
            if (open) setQ("");
          }}
          className={`flex min-h-[36px] min-w-0 touch-manipulation items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs font-medium shadow-sm transition active:scale-[0.99] ${
            isInline ? "w-full" : "w-full sm:flex-1"
          } ${value !== "all" ? ring : idle}`}
        >
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? "—"}</span>
          <span className="shrink-0 tabular-nums text-[10px] opacity-80">{selected?.count ?? 0}</span>
          <svg
            className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open ? (
        <div
          className={`absolute top-full z-[60] mt-1.5 flex max-h-[min(70vh,22rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950 ${popoverPosition}`}
          role="listbox"
          id={searchId}
        >
          <div className="shrink-0 border-b border-zinc-100 p-2 dark:border-zinc-800">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              autoFocus
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-900 outline-none ring-zinc-400/30 placeholder:text-zinc-400 focus:border-blue-400 focus:bg-white focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-600"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">{noMatchesLabel}</li>
            ) : (
              filtered.map((item) => {
                const isActive = value === item.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onChange(item.key);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`flex w-full min-h-[40px] items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition ${
                        isActive
                          ? activeRow
                          : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="shrink-0 tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                        {item.count}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
