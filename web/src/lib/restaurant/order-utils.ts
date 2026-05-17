export type RestaurantOrderStatus = "new" | "preparing" | "ready" | "served" | "settled";

export function statusBadgeClass(status: RestaurantOrderStatus): string {
  if (status === "new") return "bg-amber-100 text-amber-900";
  if (status === "preparing") return "bg-sky-100 text-sky-900";
  if (status === "ready") return "bg-brand-100 text-brand-900";
  if (status === "served") return "bg-violet-100 text-violet-900";
  return "bg-zinc-200 text-zinc-800";
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
