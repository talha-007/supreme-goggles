import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { listSignupUsersForAdmin } from "@/lib/admin/admin-actions";
import { getTranslations } from "next-intl/server";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin");
  const result = await listSignupUsersForAdmin();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-medium">{t("loadError")}</p>
        <p className="mt-2 text-sm">{result.error}</p>
        <p className="mt-4 text-sm text-red-800/90">{t("usersHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {t("usersTitle")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">{t("usersIntro")}</p>

      <div className="mt-8">
        <AdminUsersTable initialRows={result.rows} />
      </div>
    </div>
  );
}
