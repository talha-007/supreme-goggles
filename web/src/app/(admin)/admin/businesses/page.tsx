import { AdminSubscriptionTable } from "@/components/admin/admin-subscription-table";
import { listBusinessesForAdmin } from "@/lib/admin/subscription-actions";
import { getTranslations } from "next-intl/server";

export default async function AdminBusinessesPage() {
  const t = await getTranslations("admin");
  const result = await listBusinessesForAdmin();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">{t("loadError")}</p>
        <p className="mt-2 text-sm">{result.error}</p>
        <p className="mt-4 text-sm text-red-800/90 dark:text-red-200/80">{t("businessesHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("subscriptionsTitle")}
      </h1>

      <div className="mt-8">
        <AdminSubscriptionTable initialRows={result.rows} />
      </div>
    </div>
  );
}
