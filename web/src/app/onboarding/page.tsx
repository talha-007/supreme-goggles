import { LanguageSwitcher } from "@/components/language-switcher";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membershipRows } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .order("id", { ascending: true })
    .limit(1);

  const membership = membershipRows?.[0];

  /** Must match `(app)/layout.tsx`: only skip onboarding when we have a real business id. */
  if (membership?.business_id) {
    redirect("/dashboard");
  }

  const rawLocale = await getLocale();
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : defaultLocale;
  const t = await getTranslations("onboarding");
  const tCommon = await getTranslations("common");

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-zinc-50">
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher locale={locale} languageLabel={tCommon("language")} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
  );
}
