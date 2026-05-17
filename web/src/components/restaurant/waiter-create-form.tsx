"use client";

import { createRestaurantWaiter, type RestaurantActionState } from "@/lib/restaurant/actions";
import { useActionState } from "react";

export function RestaurantWaiterCreateForm() {
  const [state, action, pending] = useActionState(createRestaurantWaiter, {} as RestaurantActionState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input
        name="name"
        required
        placeholder="Waiter name"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <input
        name="phone"
        placeholder="Phone (optional)"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add waiter"}
      </button>
      {state.error ? <p className="sm:col-span-3 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
