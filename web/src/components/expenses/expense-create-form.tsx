"use client";

import { createExpense, type ExpenseActionState } from "@/lib/expenses/actions";
import { useActionState } from "react";

export function ExpenseCreateForm() {
  const [state, formAction, pending] = useActionState(
    createExpense,
    {} as ExpenseActionState,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="expense_date" className="text-sm font-medium text-zinc-700">
            Date
          </label>
          <input
            id="expense_date"
            name="expense_date"
            type="date"
            defaultValue={today}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-zinc-700">
            Category
          </label>
          <input
            id="category"
            name="category"
            placeholder="e.g. rent, utility, salary"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700">
          Description <span className="text-red-600">*</span>
        </label>
        <input
          id="description"
          name="description"
          required
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium text-zinc-700">
            Amount (PKR) <span className="text-red-600">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="payment_method" className="text-sm font-medium text-zinc-700">
            Payment method
          </label>
          <input
            id="payment_method"
            name="payment_method"
            placeholder="cash / bank / easypaisa"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="vendor_name" className="text-sm font-medium text-zinc-700">
            Vendor
          </label>
          <input
            id="vendor_name"
            name="vendor_name"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
            Notes
          </label>
          <input
            id="notes"
            name="notes"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}
