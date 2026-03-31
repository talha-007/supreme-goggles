import { CUSTOMER_TYPES } from "@/types/customer";
import type { CustomerRow } from "@/types/customer";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { getLocale, getTranslations } from "next-intl/server";

type Props = {
  defaultValues?: Partial<CustomerRow>;
  /** When set, show read-only balance (from invoices / payments). */
  showOutstandingReadOnly?: boolean;
};

export async function CustomerFields({ defaultValues, showOutstandingReadOnly }: Props) {
  const t = await getTranslations("customerFields");
  const tType = await getTranslations("customerType");
  const locale = await getLocale();
  const d = defaultValues ?? {};

  const money = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("name")} <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={d.name}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("phone")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={d.phone ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={d.email ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("address")}
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={d.address ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("customerType")}
        </label>
        <select
          id="type"
          name="type"
          defaultValue={d.type ?? "retail"}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {CUSTOMER_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {tType(opt.value as "retail" | "wholesale" | "walkin")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="credit_limit" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("creditLimit")}
        </label>
        <input
          id="credit_limit"
          name="credit_limit"
          type="number"
          min={0}
          step="0.01"
          defaultValue={d.credit_limit ?? 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      {showOutstandingReadOnly && d.outstanding_balance !== undefined ? (
        <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("outstandingBalance")}
          </p>
          <p className="mt-1 text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            {money.format(d.outstanding_balance)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("outstandingHint")}</p>
        </div>
      ) : null}
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("notes")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={d.notes ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2 pt-1">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={d.is_active !== false}
          className="size-4 rounded border-zinc-300"
        />
        <label htmlFor="is_active" className="text-sm text-zinc-700 dark:text-zinc-300">
          {t("active")}
        </label>
      </div>
    </div>
  );
}
