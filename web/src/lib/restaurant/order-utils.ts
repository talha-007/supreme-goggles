export type RestaurantOrderStatus = "new" | "preparing" | "ready" | "served" | "settled";

export function statusBadgeClass(status: RestaurantOrderStatus): string {
  if (status === "new") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (status === "preparing") return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200";
  if (status === "ready") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "served") return "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200";
  return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";
}

export function nextStatusForKitchen(status: RestaurantOrderStatus): RestaurantOrderStatus | null {
  if (status === "new") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

export function nextStatusForWaiter(status: RestaurantOrderStatus): RestaurantOrderStatus | null {
  if (status === "ready") return "served";
  return null;
}
