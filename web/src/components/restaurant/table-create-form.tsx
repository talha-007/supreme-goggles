"use client";

import { createRestaurantTable, type RestaurantActionState } from "@/lib/restaurant/actions";
import { useActionState } from "react";

export function RestaurantTableCreateForm() {
  const [state, action, pending] = useActionState(createRestaurantTable, {} as RestaurantActionState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input
        name="name"
        required
        placeholder="Table 1"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="seats"
        type="number"
        min={1}
        defaultValue={4}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Add table"}
      </button>
      {state.error ? <p className="sm:col-span-3 text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
    </form>
  );
}
