import { createClient } from "@supabase/supabase-js";

/**
 * Client for **email** flows (e.g. password reset) that must work when the user
 * opens the link from email in a different app/browser than the one that
 * requested the link.
 *
 * The default `createClient` from `@/lib/supabase/client` uses
 * `createBrowserClient` which forces `flowType: "pkce"`. PKCE requires the
 * one-time `code` to be exchanged with a `code_verifier` stored in the same
 * browser session — that breaks for password-reset links opened on another
 * device or in the system browser.
 *
 * Implicit flow returns `access_token` + `refresh_token` in the URL **hash**;
 * our `/auth/callback` page already handles that before `?code=`.
 */
export function createPasswordResetRequestClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    },
  );
}
