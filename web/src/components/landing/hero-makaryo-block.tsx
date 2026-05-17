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
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src={BRAND_LOGO.dark}
              alt={BRAND_NAME}
              width={140}
              height={48}
              className="h-8 w-auto object-contain sm:h-9"
              priority
            />
            <span className="hidden truncate text-xs font-medium text-zinc-500 sm:inline">
              {BRAND_DOMAIN}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher locale={locale} languageLabel={tCommon("language")} />
            </div>
            <Link
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
              href="/login"
            >
              {t("navLoginShort")}
            </Link>
            <Link
              className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              href="/signup"
            >
              {t("navTrialShort")}
            </Link>
          </div>
        </div>
        <div className="border-t border-zinc-200 sm:hidden">
          <div className="flex items-center justify-center px-2 py-2">
            <LanguageSwitcher locale={locale} languageLabel={tCommon("language")} />
          </div>
        </div>
      </header>

      <section
        className="flex flex-1 border-b border-zinc-200/80 bg-white"
        id="top"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-3 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
          <div className="min-w-0 flex-1 text-center lg:text-start">
            <p className="mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-800 lg:mx-0">
              {t("heroPill")}
            </p>
            <h1
              id="hero-heading"
              className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-4xl"
            >
              {t("headlineMak")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-balance text-base text-zinc-600 lg:mx-0">
              {t("subMak")}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm font-medium text-zinc-700 lg:mx-0">
              {t("heroAppPlatforms")}
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:mx-0 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3">
              <Link
                className="inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 sm:w-[min(12rem,100%)]"
                href="/signup"
              >
                {t("heroCtaWeb")}
              </Link>
              {androidUrl ? (
                <AndroidAppDownloadLink className="inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-[min(12rem,100%)]">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
                  {t("heroCtaAndroid")}
                </AndroidAppDownloadLink>
              ) : (
                <p className="flex min-h-10 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-100/50 px-4 text-center text-xs text-zinc-600 sm:w-[min(100%,20rem)]">
                  {t("androidNoUrl")}
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-500">{t("heroWebSignIn")}</p>
            <Link
              className="mt-1 text-sm font-semibold text-brand-700 hover:underline"
              href="/login"
            >
              {t("navLoginShort")} â†’
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-[min(100%,360px)] flex-1 flex-col items-center justify-center lg:max-w-none">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("heroAppPreview")}
            </p>
            <HeroMobileAppMock />
            <p className="mt-4 text-center text-xs text-zinc-500">{t("heroMobileDisclaimer")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
