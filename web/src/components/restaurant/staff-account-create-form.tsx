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
    <form action={action} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5">
      <input
        name="name"
        required
        placeholder="Name"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <select
        name="role"
        defaultValue="waiter"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      >
        <option value="waiter">Waiter</option>
        <option value="chef">Chef</option>
        <option value="counter">Counter</option>
      </select>
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="staff@example.com"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <input
        name="password"
        type="password"
        minLength={8}
        required
        placeholder="Temporary password"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="sm:col-span-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Creating accountâ€¦" : "Create staff login"}
      </button>
      {state.error ? <p className="sm:col-span-5 text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="sm:col-span-5 text-sm text-brand-700">{state.success}</p> : null}
    </form>
  );
}
