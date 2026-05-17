import { getAdminOverview } from "@/lib/admin/admin-actions";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  const result = await getAdminOverview();

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-medium">{t("loadError")}</p>
        <p className="mt-2 text-sm">{result.error}</p>
        <p className="mt-4 text-sm text-red-800/90">{t("overviewHint")}</p>
      </div>
    );
  }

  const { stats } = result;

  const cards = [
    {
      label: t("statTotalUsers"),
      value: stats.totalAuthUsers,
      href: "/admin/users",
      desc: t("statTotalUsersDesc"),
    },
    {
      label: t("statTotalBusinesses"),
      value: stats.totalBusinesses,
      href: "/admin/businesses",
      desc: t("statTotalBusinessesDesc"),
    },
    {
      label: t("statOnboarded"),
      value: stats.usersWithBusiness,
      href: "/admin/users",
      desc: t("statOnboardedDesc"),
    },
    {
      label: t("statNoBusiness"),
      value: stats.usersWithoutBusiness,
      href: "/admin/users",
      desc: t("statNoBusinessDesc"),
    },
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {t("overviewTitle")}
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">{t("overviewIntro")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
              {c.value}
            </p>
            <p className="mt-2 text-xs text-zinc-500 group-hover:text-violet-700">
              {c.desc} →
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/users"
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
        >
          {t("ctaUsers")}
        </Link>
        <Link
          href="/admin/businesses"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          {t("ctaBusinesses")}
        </Link>
      </div>
    </div>
  );
}
