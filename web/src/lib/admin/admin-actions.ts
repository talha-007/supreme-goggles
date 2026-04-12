"use server";

import { assertSuperadmin } from "@/lib/admin/gate";
import type {
  AdminOverviewResult,
  AdminOverviewStats,
  AdminUserRow,
  AdminUsersResult,
} from "@/lib/admin/panel-types";
import {
  createServiceRoleClient,
  fetchAllAuthUsersViaAdminApi,
  type AuthAdminUserRecord,
} from "@/lib/supabase/admin";

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
