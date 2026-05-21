"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  locale: AppLocale;
  languageLabel: string;
};

export function AuthTopBar({ locale, languageLabel }: Props) {
  return (
    <div className="absolute end-4 top-4 z-10 flex flex-wrap items-center justify-end gap-3">
      <ThemeSwitcher />
      <LanguageSwitcher locale={locale} languageLabel={languageLabel} />
    </div>
  );
}
