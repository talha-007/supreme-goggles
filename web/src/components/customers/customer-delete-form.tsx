"use client";

import { deleteCustomer, type CustomerActionState } from "@/lib/customers/actions";
import type { CustomerRow } from "@/types/customer";
import { useActionState, useMemo } from "react";
import { useTranslations } from "next-intl";

type Props = {
  customerId: string;
  outstandingBalance: CustomerRow["outstanding_balance"];
};

function moneyCents(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100);
}

export function CustomerDeleteForm({ customerId, outstandingBalance }: Props) {
  const t = useTranslations("customers");
  const deleteAction = useMemo(() => deleteCustomer.bind(null, customerId), [customerId]);
  const [state, formAction, pending] = useActionState(deleteAction, {} as CustomerActionState);
  const blocked = moneyCents(outstandingBalance) !== 0;

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6">
      <h3 className="text-sm font-semibold text-zinc-900">{t("deleteSectionTitle")}</h3>
      <p className="mt-1 text-xs text-zinc-600">{t("deleteSectionHint")}</p>
      {blocked ? (
        <p className="mt-2 text-sm text-amber-800">{t("deleteBlockedOutstanding")}</p>
      ) : null}
      {state.error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <form
        action={formAction}
        className="mt-3"
        onSubmit={(e) => {
          if (blocked) {
            e.preventDefault();
            return;
          }
          if (!window.confirm(t("deleteConfirm"))) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={pending || blocked}
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? t("deleteSubmitting") : t("deleteSubmit")}
        </button>
      </form>
    </div>
  );
}
