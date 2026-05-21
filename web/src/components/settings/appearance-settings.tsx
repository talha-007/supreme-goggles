"use client";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTranslations } from "next-intl";

export function AppearanceSettings() {
  const t = useTranslations("settings");

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-zinc-900">{t("appearanceSection")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("appearanceSectionDesc")}</p>
      <div className="mt-6">
        <ThemeSwitcher />
      </div>
    </section>
  );
}
