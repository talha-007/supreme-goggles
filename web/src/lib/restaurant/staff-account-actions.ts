"use server";

import { canManageBusinessSettings, requireBusinessContext } from "@/lib/auth/business-context";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type StaffAccountActionState = { error?: string; success?: string };

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRole(value: FormDataEntryValue | null): "waiter" | "chef" | "counter" | null {
  const r = String(value ?? "").trim();
  if (r === "waiter" || r === "chef" || r === "counter") return r;
  return null;
}

export async function createRestaurantStaffAccount(
  _prev: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageBusinessSettings(ctx.role)) return { error: "Permission denied." };

  const name = String(formData.get("name") ?? "").trim();
  const role = normalizeRole(formData.get("role"));
  const phone = String(formData.get("phone") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!role) return { error: "Role is required." };
  if (!email || !email.includes("@")) return { error: "Valid email is required." };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };

  const service = createServiceRoleClient();
  const supabase = await createClient();

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      restaurant_business_id: ctx.businessId,
      restaurant_staff_role: role,
    },
  });
  if (createErr) return { error: createErr.message };
  const userId = created.user?.id;
  if (!userId) return { error: "Could not create auth user." };

  const { error: memberErr } = await service.from("business_members").insert({
    business_id: ctx.businessId,
    user_id: userId,
    role: "viewer",
    invited_by: ctx.userId,
  });
  if (memberErr && memberErr.code !== "23505") {
    await service.auth.admin.deleteUser(userId);
    return { error: memberErr.message };
  }

  const { error: staffErr } = await supabase.from("restaurant_staff").insert({
    business_id: ctx.businessId,
    name,
    role,
    phone: phone || null,
    is_active: true,
    user_id: userId,
  });
  if (staffErr) {
    await service.auth.admin.deleteUser(userId);
    return { error: staffErr.message };
  }

  revalidatePath("/dashboard/restaurant/staff");
  return { success: "Staff account created." };
}

export async function resetRestaurantStaffPassword(
  _prev: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageBusinessSettings(ctx.role)) return { error: "Permission denied." };

  const staffId = String(formData.get("staff_id") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "");
  if (!staffId) return { error: "Staff id is required." };
  if (!newPassword || newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data: staff, error: staffErr } = await supabase
    .from("restaurant_staff")
    .select("id, user_id, business_id")
    .eq("id", staffId)
    .eq("business_id", ctx.businessId)
    .maybeSingle();
  if (staffErr) return { error: staffErr.message };
  if (!staff?.user_id) return { error: "This staff member has no linked login account." };

  const service = createServiceRoleClient();
  const { error: updErr } = await service.auth.admin.updateUserById(staff.user_id as string, {
    password: newPassword,
  });
  if (updErr) return { error: updErr.message };

  revalidatePath("/dashboard/restaurant/staff");
  return { success: "Password updated." };
}
