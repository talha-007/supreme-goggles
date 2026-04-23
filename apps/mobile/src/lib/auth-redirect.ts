import { createURL } from "expo-linking";
import Constants from "expo-constants";

/**
 * `emailRedirectTo` for mobile sign-up:
 *
 * - **Web** (Next.js) still uses `https://…/auth/callback` — same public URL, works in any browser.
 * - **This app (release builds)** uses the native scheme (`pos-mobile://auth/callback`) from
 *   `createURL`, so the Supabase email “Confirm” link can open the installed app instead of
 *   only the browser. Add that exact string to Supabase → Authentication → Redirect URLs.
 * - **Development** uses the same `https` callback as local web so you can test confirmation
 *   in the dev server / browser without depending on a stable `exp://` URL.
 * - Set `EXPO_PUBLIC_EMAIL_REDIRECT_USE_SITE_URL=1` to always use the site URL (e.g. while
 *   the custom scheme is not yet added in Supabase).
 */
export function getEmailRedirectUrl(): string {
  const useSite =
    typeof process.env.EXPO_PUBLIC_EMAIL_REDIRECT_USE_SITE_URL === "string" &&
    process.env.EXPO_PUBLIC_EMAIL_REDIRECT_USE_SITE_URL === "1";

  const extra = Constants.expoConfig?.extra as { siteUrl?: string } | undefined;
  const raw =
    typeof extra?.siteUrl === "string" && extra.siteUrl.length > 0
      ? extra.siteUrl
      : "http://localhost:3000";
  const siteUrl = raw.replace(/\/$/, "");
  const httpsCallback = `${siteUrl}/auth/callback`;

  if (useSite || __DEV__) {
    return httpsCallback;
  }

  return createURL("auth/callback");
}

/** Password reset email link: browser opens web `/auth/callback` then `/auth/update-password`. */
export function getPasswordResetRedirectUrl(): string {
  const extra = Constants.expoConfig?.extra as { siteUrl?: string } | undefined;
  const raw =
    typeof extra?.siteUrl === "string" && extra.siteUrl.length > 0
      ? extra.siteUrl
      : "http://localhost:3000";
  const siteUrl = raw.replace(/\/$/, "");
  const next = encodeURIComponent("/auth/update-password");
  return `${siteUrl}/auth/callback?next=${next}`;
}
