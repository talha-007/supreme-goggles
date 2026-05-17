"use client";

import {
  updateBusinessInvoiceDefaults,
  type BusinessInvoiceDefaults,
} from "@/lib/settings/actions";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

type Props = {
  initial: BusinessInvoiceDefaults;
  canEdit: boolean;
};

export function InvoiceDefaultsForm({ initial, canEdit }: Props) {
  const [state, action, pending] = useActionState(updateBusinessInvoiceDefaults, {});
  const t = useTranslations("invoiceDefaults");
  const tc = useTranslations("common");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="default_tax_rate" className="text-sm font-medium text-zinc-700">
            {t("defaultTaxRate")}
          </label>
          <input
            id="default_tax_rate"
            name="default_tax_rate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={initial.default_tax_rate}
            disabled={!canEdit}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60"
          />
          <p className="text-xs text-zinc-500">{t("defaultTaxRateHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tax_label" className="text-sm font-medium text-zinc-700">
            {t("taxLabel")}
          </label>
          <input
            id="tax_label"
            name="tax_label"
            type="text"
            placeholder={t("taxLabelPlaceholder")}
            defaultValue={initial.tax_label ?? ""}
            disabled={!canEdit}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="default_invoice_discount_amount"
            className="text-sm font-medium text-zinc-700"
          >
            {t("defaultDiscount")}
          </label>
          <input
            id="default_invoice_discount_amount"
            name="default_invoice_discount_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial.default_invoice_discount_amount}
            disabled={!canEdit}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60"
          />
          <p className="text-xs text-zinc-500">{t("defaultDiscountHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="default_line_discount_pct"
            className="text-sm font-medium text-zinc-700"
          >
            {t("defaultLineDisc")}
          </label>
          <input
            id="default_line_discount_pct"
            name="default_line_discount_pct"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={initial.default_line_discount_pct}
            disabled={!canEdit}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60"
          />
          <p className="text-xs text-zinc-500">{t("defaultLineDiscHint")}</p>
        </div>
      </div>
      {canEdit ? (
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? tc("saving") : t("saveButton")}
        </button>
      ) : (
        <p className="text-sm text-zinc-500">{tc("onlyOwnersManagersDefaults")}</p>
      )}
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
