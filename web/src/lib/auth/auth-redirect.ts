/**
 * Public site origin for OAuth and email link redirects (client-side).
 * Prefer `NEXT_PUBLIC_SITE_URL` in production; fall back to the current tab origin.
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
