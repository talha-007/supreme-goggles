"use client";

import {
  createRestaurantStaffAccount,
  type StaffAccountActionState,
} from "@/lib/restaurant/staff-account-actions";
import { useActionState } from "react";

export function StaffAccountCreateForm() {
  const [state, action, pending] = useActionState(
    createRestaurantStaffAccount,
    {} as StaffAccountActionState,
  );

  return (
    <form action={action} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-950">
      <input
        name="name"
        required
        placeholder="Name"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        name="role"
        defaultValue="waiter"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="waiter">Waiter</option>
        <option value="chef">Chef</option>
        <option value="counter">Counter</option>
      </select>
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="staff@example.com"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="password"
        type="password"
        minLength={8}
        required
        placeholder="Temporary password"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="sm:col-span-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Creating account…" : "Create staff login"}
      </button>
      {state.error ? <p className="sm:col-span-5 text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.success ? <p className="sm:col-span-5 text-sm text-emerald-700 dark:text-emerald-300">{state.success}</p> : null}
    </form>
  );
}
