"use client";

import { CustomerFields } from "@/components/customers/customer-fields";
import {
  updateCustomer,
  type CustomerActionState,
} from "@/lib/customers/actions";
import type { CustomerRow } from "@/types/customer";
import { useActionState, useMemo } from "react";

export function CustomerEditForm({ customer }: { customer: CustomerRow }) {
  const updateAction = useMemo(
    () => updateCustomer.bind(null, customer.id),
    [customer.id],
  );
  const [state, formAction, pending] = useActionState(
    updateAction,
    {} as CustomerActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <CustomerFields defaultValues={customer} showOutstandingReadOnly />
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
