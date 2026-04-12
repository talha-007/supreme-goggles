"use client";

import { useMemo, useState } from "react";

type Props = {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  suggestions: readonly string[];
  noMatchesLabel: string;
};

/**
 * Text field with a searchable dropdown when suggestions exist (long category/brand lists).
 */
export function SearchableSuggestionsInput({
  id,
  name,
  label,
  defaultValue,
  suggestions,
  noMatchesLabel,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const sq = value.trim().toLowerCase();
    if (!sq) return [...suggestions].slice(0, 400);
    return [...suggestions].filter((s) => s.toLowerCase().includes(sq)).slice(0, 400);
  }, [suggestions, value]);

  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => hasSuggestions && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 200)}
        autoComplete="off"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {open && hasSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">{noMatchesLabel}</p>
          ) : (
            <ul className="py-1">
              {filtered.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setValue(s);
                      setOpen(false);
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
