import { AndroidAppDownloadLink } from "@/components/android-app-download-link";
import { createClient } from "@/lib/supabase/server";
import { getAndroidAppUrl } from "@/lib/brand";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signInTitle"),
    description: t("signInSubtitle"),
    robots: { index: true, follow: true },
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string; reason?: string; reset?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const t = await getTranslations("auth");
  const androidAppUrl = getAndroidAppUrl();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("signInTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("signInSubtitle")}</p>
      {params.error === "auth" ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {params.reason === "crossdevice"
            ? t("pkceError")
            : t("authError", { callback: t("callbackPath") })}
        </p>
      ) : null}
      {params.error === "oauth" && params.details ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {params.details}
        </p>
      ) : null}
      {params.reset === "1" || params.reset === "success" ? (
        <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {t("loginAfterReset")}
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm />
      </div>
      {androidAppUrl ? (
        <div className="mt-6 border-t border-zinc-200 pt-5 text-center dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <AndroidAppDownloadLink className="font-semibold text-emerald-700 decoration-emerald-600/30 hover:underline dark:text-emerald-400">
              {t("downloadAndroidApp")}
            </AndroidAppDownloadLink>
          </p>
        </div>
      ) : null}
    </div>
  );
}
