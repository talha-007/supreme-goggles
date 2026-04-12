export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  business_id: string | null;
  business_name: string | null;
  business_subscription: string | null;
  business_subscription_ends_at: string | null;
  member_role: string | null;
};

export type AdminOverviewStats = {
  totalAuthUsers: number;
  totalBusinesses: number;
  usersWithBusiness: number;
  usersWithoutBusiness: number;
};

export type AdminOverviewResult =
  | { ok: true; stats: AdminOverviewStats }
  | { ok: false; error: string };

export type AdminUsersResult =
  | { ok: true; rows: AdminUserRow[] }
  | { ok: false; error: string };
