/**
 * Public site origin for **email** links and other flows where the tab might not
 * be open yet (e.g. password reset) — can follow `NEXT_PUBLIC_SITE_URL` from build.
 */
export function getClientAuthRedirectOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return window.location.origin;
}

/**
 * Origin to use for OAuth `redirectTo` **in the same browser session** that started
 * the flow. Must match `window.location.origin` (PKCE verifier + cookies are host-bound).
 * Do **not** override with `NEXT_PUBLIC_SITE_URL` when the user is on a different
 * host (e.g. www vs apex) — that breaks `exchangeCodeForSession` and looks like
 * "Google account picker then nothing / back to login".
 */
export function getOauthClientRedirectOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}
