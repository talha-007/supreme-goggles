"use client";

import { setUserLocale } from "@/i18n/actions";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type LanguageSwitcherProps = {
  locale: AppLocale;
  languageLabel: string;
};
export function LanguageSwitcher({ locale, languageLabel }: LanguageSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!isAppLocale(next)) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="hidden sm:inline">{languageLabel}</span>
      <select
        value={locale}
        onChange={onChange}
        disabled={pending}
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        aria-label={languageLabel}
      >
        <option value="en">English</option>
        <option value="ur">اردو</option>
      </select>
    </label>
  );
}
