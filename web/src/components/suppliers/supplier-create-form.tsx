"use client";

import {
  createSupplier,
  type SupplierActionState,
} from "@/lib/suppliers/actions";
import { useActionState } from "react";

export function SupplierCreateForm() {
  const [state, formAction, pending] = useActionState(
    createSupplier,
    {} as SupplierActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Saving…" : "Save supplier"}
      </button>
    </form>
  );
}
