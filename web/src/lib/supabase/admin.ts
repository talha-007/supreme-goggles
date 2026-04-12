import { createClient } from "@supabase/supabase-js";

/** Minimal shape returned by GoTrue `GET /auth/v1/admin/users` (paginated). */
export type AuthAdminUserRecord = {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};

function getSupabaseUrl(): string | undefined {
  const u =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  return u || undefined;
}

function getServiceRoleKey(): string | undefined {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return k || undefined;
}

/**
 * Server-only PostgREST client. Uses service role (bypasses RLS).
 * Auth options avoid session persistence issues in server actions.
 */
export function createServiceRoleClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * List all auth users via the Auth REST API with explicit Bearer + apikey headers.
 * More reliable than `supabase.auth.admin.listUsers()` in some server runtimes
 * (avoids "This endpoint requires a valid Bearer token" when the JS client does
 * not attach the service JWT correctly to admin routes).
 */
export async function fetchAllAuthUsersViaAdminApi(): Promise<{
  users: AuthAdminUserRecord[];
  error: string | null;
}> {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) {
    return {
      users: [],
      error:
        "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const base = url.replace(/\/$/, "");
  const allUsers: AuthAdminUserRecord[] = [];
  let page = 1;
  const perPage = 1000;

  for (;;) {
    const endpoint = `${base}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const raw = await res.text();
    if (!res.ok) {
      let msg = raw || res.statusText;
      try {
        const j = JSON.parse(raw) as { message?: string; msg?: string; error?: string };
        msg = j.message ?? j.msg ?? j.error ?? msg;
      } catch {
        // keep raw
      }
      return { users: [], error: msg || `HTTP ${res.status}` };
    }

    let json: { users?: AuthAdminUserRecord[] };
    try {
      json = JSON.parse(raw) as { users?: AuthAdminUserRecord[] };
    } catch {
      return { users: [], error: "Invalid JSON from Auth admin API." };
    }

    const batch = json.users ?? [];
    allUsers.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }

  return { users: allUsers, error: null };
}
