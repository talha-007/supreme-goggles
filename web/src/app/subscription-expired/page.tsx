import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SubscriptionExpiredPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-xl font-semibold text-red-900 dark:text-red-100">
          Subscription access expired
        </h1>
        <p className="mt-2 text-sm text-red-800 dark:text-red-200">
          Your trial or subscription period has ended. Please contact support or renew your plan to continue using the dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/businesses"
            className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            {t("title")}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/50"
          >
            {tc("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
