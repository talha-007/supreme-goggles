import { createClient } from "@supabase/supabase-js";

/**
 * Used only for `signUp`. `createBrowserClient` from @supabase/ssr forces PKCE, so
 * confirmation links use `?code=` and require the same browser’s code verifier.
 * Implicit flow puts tokens in the URL hash so the link works from any browser/app.
 */
export function createSignUpClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
