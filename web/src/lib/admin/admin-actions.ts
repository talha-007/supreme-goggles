"use server";

import { assertSuperadmin } from "@/lib/admin/gate";
import type {
  AdminOverviewResult,
  AdminOverviewStats,
  AdminUserRow,
  AdminUsersResult,
} from "@/lib/admin/panel-types";
import { isSuperadminUser } from "@/lib/auth/superadmin";
import { deleteBusinessLogoByUrl } from "@/lib/storage/business-logos";
import {
  createServiceRoleClient,
  fetchAllAuthUsersViaAdminApi,
  type AuthAdminUserRecord,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateAdminUserViews() {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
}

/** Clear public rows that reference auth.users before Auth admin deleteUser. */
async function clearPublicReferencesToAuthUser(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patches: { table: string; column: string }[] = [
    { table: "business_members", column: "invited_by" },
    { table: "invitations", column: "invited_by" },
    { table: "products", column: "created_by" },
    { table: "stock_movements", column: "created_by" },
    { table: "customers", column: "created_by" },
    { table: "invoices", column: "created_by" },
    { table: "payments", column: "received_by" },
    { table: "purchase_orders", column: "created_by" },
  ];
  for (const { table, column } of patches) {
    const { error } = await service.from(table).update({ [column]: null }).eq(column, userId);
    if (error) {
      return { ok: false, error: `${table}.${column}: ${error.message}` };
    }
  }
  return { ok: true };
}

async function removeProductImagesForBusiness(
  service: ReturnType<typeof createServiceRoleClient>,
  businessId: string,
): Promise<void> {
  const { data: products } = await service.from("products").select("id").eq("business_id", businessId);
  const bucket = "product-images";
  for (const row of products ?? []) {
    const pid = row.id as string;
    const folder = `${businessId}/${pid}`;
    const { data: files } = await service.storage.from(bucket).list(folder);
    const paths = (files ?? []).map((f) => `${folder}/${f.name}`);
    if (paths.length > 0) {
      await service.storage.from(bucket).remove(paths);
    }
  }
}

/**
 * Permanently delete an Auth user and remove every business they **own**
 * (full DB + storage cascade for those shops). Non-owner memberships on
 * someone else's business are dropped when the Auth user is removed.
 * Restaurant staff login users tied only to deleted shops are removed from Auth.
 */
export async function adminDeleteUserAndOwnedBusinesses(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  if (!UUID_RE.test(userId)) {
    return { ok: false, error: "Invalid user id." };
  }

  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor?.id) {
    return { ok: false, error: "Not signed in." };
  }
  if (actor.id === userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  const service = createServiceRoleClient();

    const { data: targetAuth, error: targetErr } = await service.auth.admin.getUserById(userId);
    if (targetErr) {
      return { ok: false, error: targetErr.message };
    }
    const targetUser = targetAuth?.user;
    if (!targetUser) {
      return { ok: false, error: "User not found." };
    }
    if (
      isSuperadminUser({
        userId,
        email: targetUser.email,
      })
    ) {
    return { ok: false, error: "Cannot delete an account that is listed as superadmin." };
  }

  try {
    const { data: memberships, error: memErr } = await service
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", userId);
    if (memErr) {
      return { ok: false, error: memErr.message };
    }

    const ownerBusinessIds = [
      ...new Set(
        (memberships ?? [])
          .filter((m) => (m.role as string) === "owner" && m.business_id)
          .map((m) => m.business_id as string),
      ),
    ];

    const staffAuthIdsToMaybeRemove = new Set<string>();
    for (const bid of ownerBusinessIds) {
      const { data: staffRows } = await service
        .from("restaurant_staff")
        .select("user_id")
        .eq("business_id", bid)
        .not("user_id", "is", null);
      for (const row of staffRows ?? []) {
        const sid = row.user_id as string | null;
        if (sid && sid !== userId) {
          staffAuthIdsToMaybeRemove.add(sid);
        }
      }

      const { data: bizRow } = await service
        .from("businesses")
        .select("logo_url")
        .eq("id", bid)
        .maybeSingle();
      await deleteBusinessLogoByUrl(service, (bizRow?.logo_url as string | null) ?? null);
      await removeProductImagesForBusiness(service, bid);

      const { error: delBizErr } = await service.from("businesses").delete().eq("id", bid);
      if (delBizErr) {
        return { ok: false, error: delBizErr.message };
      }
    }

    const cleared = await clearPublicReferencesToAuthUser(service, userId);
    if (!cleared.ok) {
      return cleared;
    }

    const { error: delAuthErr } = await service.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      return { ok: false, error: delAuthErr.message };
    }

    for (const sid of staffAuthIdsToMaybeRemove) {
      if (sid === actor.id) continue;
      const { data: stillMember } = await service
        .from("business_members")
        .select("id")
        .eq("user_id", sid)
        .limit(1);
      if (stillMember?.length) continue;

      const { data: staffAuth, error: staffGetErr } = await service.auth.admin.getUserById(sid);
      if (staffGetErr || !staffAuth?.user) continue;
      if (
        isSuperadminUser({
          userId: sid,
          email: staffAuth.user.email,
        })
      ) {
        continue;
      }
      const c = await clearPublicReferencesToAuthUser(service, sid);
      if (!c.ok) {
        return { ok: false, error: `Staff cleanup (${sid}): ${c.error}` };
      }
      const { error: delStaffErr } = await service.auth.admin.deleteUser(sid);
      if (delStaffErr) {
        return { ok: false, error: `Staff Auth delete (${sid}): ${delStaffErr.message}` };
      }
    }

    revalidateAdminUserViews();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed.";
    return { ok: false, error: msg };
  }
}

export async function getAdminOverview(): Promise<AdminOverviewResult> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  try {
    const { users, error: uerr } = await fetchAllAuthUsersViaAdminApi();
    if (uerr) {
      return { ok: false, error: uerr };
    }
    const service = createServiceRoleClient();

    const { count: businessCount, error: berr } = await service
      .from("businesses")
      .select("id", { count: "exact", head: true });
    if (berr) {
      return { ok: false, error: berr.message };
    }
    const totalBusinesses = businessCount ?? 0;

    const userIds = users.map((u) => u.id);
    let usersWithBusiness = 0;
    if (userIds.length > 0) {
      const withBiz = new Set<string>();
      const chunk = 500;
      for (let i = 0; i < userIds.length; i += chunk) {
        const slice = userIds.slice(i, i + chunk);
        const { data: members, error: merr } = await service
          .from("business_members")
          .select("user_id")
          .in("user_id", slice);
        if (merr) {
          return { ok: false, error: merr.message };
        }
        for (const m of members ?? []) {
          withBiz.add(m.user_id as string);
        }
      }
      usersWithBusiness = withBiz.size;
    }

    const stats: AdminOverviewStats = {
      totalAuthUsers: users.length,
      totalBusinesses: typeof totalBusinesses === "number" ? totalBusinesses : 0,
      usersWithBusiness,
      usersWithoutBusiness: users.length - usersWithBusiness,
    };
    return { ok: true, stats };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Overview failed.";
    return { ok: false, error: msg };
  }
}

export async function listSignupUsersForAdmin(): Promise<AdminUsersResult> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  try {
    const { users, error: uerr } = await fetchAllAuthUsersViaAdminApi();
    if (uerr) {
      return { ok: false, error: uerr };
    }
    const service = createServiceRoleClient();

    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return { ok: true, rows: [] };
    }

    const members: { user_id: string; business_id: string; role: string }[] = [];
    const chunk = 500;
    for (let i = 0; i < userIds.length; i += chunk) {
      const slice = userIds.slice(i, i + chunk);
      const { data: batch, error: merr } = await service
        .from("business_members")
        .select("user_id, business_id, role")
        .in("user_id", slice);
      if (merr) {
        return { ok: false, error: merr.message };
      }
      members.push(
        ...((batch ?? []) as { user_id: string; business_id: string; role: string }[]),
      );
    }

    const businessIds = [...new Set(members.map((m) => m.business_id as string))];
    let bizList: {
      id: string;
      name: string;
      subscription_status: string | null;
      subscription_ends_at: string | null;
    }[] = [];
    if (businessIds.length > 0) {
      const { data: businesses, error: berr } = await service
        .from("businesses")
        .select("id, name, subscription_status, subscription_ends_at")
        .in("id", businessIds);
      if (berr) {
        return { ok: false, error: berr.message };
      }
      bizList = (businesses ?? []) as typeof bizList;
    }

    const bizMap = new Map(bizList.map((b) => [b.id, b]));
    type MemberRow = { user_id: string; business_id: string; role: string };
    const memberByUser = new Map<string, MemberRow>();
    for (const m of members ?? []) {
      if (!memberByUser.has(m.user_id as string)) {
        memberByUser.set(m.user_id as string, m);
      }
    }

    const rows: AdminUserRow[] = users.map((u: AuthAdminUserRecord) => {
      const m = memberByUser.get(u.id);
      const biz = m ? bizMap.get(m.business_id as string) : undefined;
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        business_id: m ? (m.business_id as string) : null,
        business_name: biz?.name ?? null,
        business_subscription: biz?.subscription_status ?? null,
        business_subscription_ends_at: biz?.subscription_ends_at ?? null,
        member_role: m ? (m.role as string) : null,
      };
    });

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load users.";
    return { ok: false, error: msg };
  }
}
