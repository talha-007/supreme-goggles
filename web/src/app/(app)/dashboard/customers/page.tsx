import { requireBusinessContext, canManageCustomers, guardOwnerPage } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import type { CustomerRow } from "@/types/customer";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

function sanitizeSearch(q: string): string {
  return q.trim().slice(0, 80).replace(/[%_]/g, "");
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  const canEdit = canManageCustomers(ctx.role);
  const params = await searchParams;
  const rawQ = params.q ?? "";
  const q = sanitizeSearch(rawQ);

  const t = await getTranslations("customers");
  const tc = await getTranslations("common");
  const tType = await getTranslations("customerType");
  const locale = await getLocale();
  const pkr = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .eq("business_id", ctx.businessId)
    .order("name", { ascending: true });

  if (q.length > 0) {
    const pattern = `%${q}%`;
    query = query.or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const customers = (rows ?? []) as CustomerRow[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/customers/new"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("addCustomer")}
          </Link>
        ) : null}
      </div>

      <form
        className="mt-6 flex max-w-md flex-col gap-2 sm:flex-row sm:items-center"
        action="/dashboard/customers"
        method="get"
      >
        <input
          name="q"
          type="search"
          defaultValue={rawQ}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {tc("search")}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-4 py-3">{t("colName")}</th>
              <th className="px-4 py-3">{t("colPhone")}</th>
              <th className="px-4 py-3">{t("colType")}</th>
              <th className="px-4 py-3 text-right">{t("colOutstanding")}</th>
              <th className="px-4 py-3">{t("colStatus")}</th>
              {canEdit ? <th className="px-4 py-3 text-right">{tc("actions")}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  {q ? t("noSearchResults") : t("emptyPrompt")}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="text-zinc-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.phone ?? tc("dash")}</td>
                  <td className="px-4 py-3">{tType(c.type as "retail" | "wholesale" | "walkin")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{pkr.format(c.outstanding_balance)}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
                        {tc("active")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                        {tc("inactive")}
                      </span>
                    )}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/customers/${c.id}/edit`}
                        className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                      >
                        {tc("edit")}
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
