"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-block h-8 min-w-[8.5rem] rounded-lg border border-transparent bg-transparent"
        aria-hidden
      />
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600">
      <span className="hidden sm:inline">{t("themeAppearance")}</span>
      <select
        value={theme === "dark" || theme === "light" || theme === "system" ? theme : "system"}
        onChange={(e) => setTheme(e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
        aria-label={t("themeAppearance")}
      >
        <option value="light">{t("themeLight")}</option>
        <option value="dark">{t("themeDark")}</option>
        <option value="system">{t("themeSystem")}</option>
      </select>
    </label>
  );
}
