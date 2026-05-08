import { AndroidAppDownloadLink } from "@/components/android-app-download-link";
import { createClient } from "@/lib/supabase/server";
import { getAndroidAppUrl } from "@/lib/brand";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("signUpTitle"),
    description: t("signUpSubtitle"),
    robots: { index: true, follow: true },
  };
}

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const t = await getTranslations("auth");
  const androidAppUrl = getAndroidAppUrl();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("signUpTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("signUpSubtitle")}</p>
      <div className="mt-6">
        <SignupForm />
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
