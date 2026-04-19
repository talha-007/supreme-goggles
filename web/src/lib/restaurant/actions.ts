"use server";

import { canManageProducts, requireBusinessContext } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RestaurantActionState = { error?: string };

export async function createRestaurantTable(
  _prev: RestaurantActionState,
  formData: FormData,
): Promise<RestaurantActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) return { error: "Permission denied." };

  const name = String(formData.get("name") ?? "").trim();
  const seats = Number(formData.get("seats") ?? 4);
  if (!name) return { error: "Table name is required." };
  if (!Number.isFinite(seats) || seats <= 0) return { error: "Seats must be greater than 0." };

  const supabase = await createClient();
  const { error } = await supabase.from("restaurant_tables").insert({
    business_id: ctx.businessId,
    name,
    seats,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/restaurant/tables");
  return {};
}

export async function createRestaurantWaiter(
  _prev: RestaurantActionState,
  formData: FormData,
): Promise<RestaurantActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) return { error: "Permission denied." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) return { error: "Waiter name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("restaurant_waiters").insert({
    business_id: ctx.businessId,
    name,
    phone: phone || null,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/restaurant/waiters");
  return {};
}
