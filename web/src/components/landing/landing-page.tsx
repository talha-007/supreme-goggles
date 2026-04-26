"use client";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { HeroMakaryoBlock } from "@/components/landing/hero-makaryo-block";
import { BRAND_DOMAIN, BRAND_LOGO, BRAND_NAME } from "@/lib/brand";
import { Noto_Naskh_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const naskhUrdu = Noto_Naskh_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function LandingPage() {
  const t = useTranslations("landing");
  const tShell = useTranslations("shell");
  const rawLoc = useLocale();
  const locale: AppLocale = isAppLocale(rawLoc) ? rawLoc : defaultLocale;
  const rootFont = locale === "ur" ? naskhUrdu.className : plusJakarta.className;

  return (
    <div
      className={`min-h-[100dvh] overflow-x-hidden bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-900 dark:text-zinc-100 ${rootFont}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white focus:ring-2 focus:ring-zinc-400"
      >
        {tShell("skipToContent")}
      </a>
      <div
        className="pointer-events-none fixed inset-0 -z-10 [background-image:radial-gradient(rgba(24,24,27,0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,#000,transparent_90%)] dark:[background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)]"
        aria-hidden
      />

      <main id="main" className="min-h-0">
        <HeroMakaryoBlock />
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-3 text-center sm:flex-row sm:text-start sm:px-6">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Image
              src={BRAND_LOGO.dark}
              alt=""
              width={100}
              height={32}
              className="h-6 w-auto opacity-80"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("footer", { year: new Date().getFullYear(), domain: BRAND_DOMAIN })}
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            {BRAND_NAME} · {BRAND_DOMAIN}
          </p>
        </div>
      </footer>
    </div>
  );
}
