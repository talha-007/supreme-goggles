"use client";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { AndroidAppDownloadLink } from "@/components/android-app-download-link";
import { HeroMakaryoBlock } from "@/components/landing/hero-makaryo-block";
import { BRAND_DOMAIN, BRAND_LOGO, BRAND_NAME, getAndroidAppUrl } from "@/lib/brand";
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
  const androidAppUrl = getAndroidAppUrl();

  return (
    <div
      className={`min-h-[100dvh] overflow-x-hidden bg-white text-zinc-900 antialiased ${rootFont}`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white focus:ring-2 focus:ring-zinc-400"
      >
        {tShell("skipToContent")}
      </a>
      <div
        className="pointer-events-none fixed inset-0 -z-10 [background-image:radial-gradient(rgba(24,24,27,0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,#000,transparent_90%)]"
        aria-hidden
      />

      <main id="main" className="min-h-0">
        <HeroMakaryoBlock />
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-3 text-center sm:flex-row sm:text-start sm:px-6">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Image
                src={BRAND_LOGO.dark}
                alt=""
                width={100}
                height={32}
                className="h-6 w-auto opacity-80"
              />
              <p className="text-xs text-zinc-500">
                {t("footer", { year: new Date().getFullYear(), domain: BRAND_DOMAIN })}
              </p>
            </div>
            {androidAppUrl ? (
              <AndroidAppDownloadLink className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline">
                {t("footerDownloadAndroid")}
              </AndroidAppDownloadLink>
            ) : null}
          </div>
          <p className="text-xs text-zinc-400">
            {BRAND_NAME} · {BRAND_DOMAIN}
          </p>
        </div>
      </footer>
    </div>
  );
}
