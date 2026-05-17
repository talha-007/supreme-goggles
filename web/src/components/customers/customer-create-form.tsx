"use client";

import { CustomerFields } from "@/components/customers/customer-fields";
import {
  createCustomer,
  type CustomerActionState,
} from "@/lib/customers/actions";
import { useActionState } from "react";

export function CustomerCreateForm() {
  const [state, formAction, pending] = useActionState(
    createCustomer,
    {} as CustomerActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <CustomerFields />
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
          {pending ? "Saving…" : "Save customer"}
        </button>
      </div>
    </form>
  );
}
