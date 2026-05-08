"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { AndroidAppDownloadLink } from "@/components/android-app-download-link";
import { BRAND_DOMAIN, BRAND_LOGO, BRAND_NAME, getAndroidAppUrl } from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { HeroMobileAppMock } from "./hero-mobile-mock";

export function HeroMakaryoBlock() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const raw = useLocale();
  const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;
  const androidUrl = getAndroidAppUrl();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src={BRAND_LOGO.light}
              alt={BRAND_NAME}
              width={140}
              height={48}
              className="h-8 w-auto object-contain sm:h-9 dark:hidden"
              priority
            />
            <Image
              src={BRAND_LOGO.dark}
              alt=""
              width={180}
              height={64}
              className="hidden h-10 w-auto object-contain sm:h-11 dark:block"
              priority
            />
            <span className="hidden truncate text-xs font-semibold text-[18px] text-zinc-500 sm:inline">
              {BRAND_DOMAIN}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher locale={locale} languageLabel={tCommon("language")} />
            </div>
            <Link
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              href="/login"
            >
              {t("navLoginShort")}
            </Link>
            <Link
              className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:hover:bg-emerald-500"
              href="/signup"
            >
              {t("navTrialShort")}
            </Link>
          </div>
        </div>
        <div className="border-t border-zinc-200 sm:hidden dark:border-zinc-800">
          <div className="flex items-center justify-center px-2 py-2">
            <LanguageSwitcher locale={locale} languageLabel={tCommon("language")} />
          </div>
        </div>
      </header>

      <section
        className="flex flex-1 border-b border-zinc-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        id="top"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-3 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
          <div className="min-w-0 flex-1 text-center lg:text-start">
            <p className="mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 lg:mx-0">
              {t("heroPill")}
            </p>
            <h1
              id="hero-heading"
              className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl"
            >
              {t("headlineMak")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-balance text-base text-zinc-600 dark:text-zinc-400 lg:mx-0">
              {t("subMak")}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm font-medium text-zinc-700 dark:text-zinc-300 lg:mx-0">
              {t("heroAppPlatforms")}
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:mx-0 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3">
              <Link
                className="inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 sm:w-[min(12rem,100%)]"
                href="/signup"
              >
                {t("heroCtaWeb")}
              </Link>
              {androidUrl ? (
                <AndroidAppDownloadLink className="inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-[min(12rem,100%)] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t("heroCtaAndroid")}
                </AndroidAppDownloadLink>
              ) : (
                <p className="flex min-h-10 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-100/50 px-4 text-center text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 sm:w-[min(100%,20rem)]">
                  {t("androidNoUrl")}
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">{t("heroWebSignIn")}</p>
            <Link
              className="mt-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              href="/login"
            >
              {t("navLoginShort")} →
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[min(100%,360px)] flex-1 flex-col items-center justify-center lg:max-w-none">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("heroAppPreview")}
            </p>
            <HeroMobileAppMock />
            <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">{t("heroMobileDisclaimer")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
