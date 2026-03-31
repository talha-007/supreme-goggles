"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium uppercase tracking-wide text-red-600 dark:text-red-400">{t("errorLabel")}</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("description")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {t("goDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
