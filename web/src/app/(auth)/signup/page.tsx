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
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
        {t("signUpTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">{t("signUpSubtitle")}</p>
      <div className="mt-6">
        <SignupForm />
      </div>
      {androidAppUrl ? (
        <div className="mt-6 border-t border-zinc-200 pt-5 text-center">
          <p className="text-xs text-zinc-500">
            <AndroidAppDownloadLink className="font-semibold text-brand-700 decoration-brand-600/30 hover:underline">
              {t("downloadAndroidApp")}
            </AndroidAppDownloadLink>
          </p>
        </div>
      ) : null}
    </div>
  );
}
