"use client";

import {
  resetRestaurantStaffPassword,
  type StaffAccountActionState,
} from "@/lib/restaurant/staff-account-actions";
import { useActionState } from "react";

export function StaffPasswordResetForm({
  staffId,
  disabled,
}: {
  staffId: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    resetRestaurantStaffPassword,
    {} as StaffAccountActionState,
  );

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="staff_id" value={staffId} />
      <input
        name="new_password"
        type="password"
        minLength={8}
        required
        disabled={disabled || pending}
        placeholder="New password"
        className="w-44 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        {pending ? "Updating…" : "Reset password"}
      </button>
      {state.error ? <span className="w-full text-right text-xs text-red-600 dark:text-red-400">{state.error}</span> : null}
      {state.success ? <span className="w-full text-right text-xs text-emerald-700 dark:text-emerald-300">{state.success}</span> : null}
    </form>
  );
}
