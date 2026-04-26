/** Product / company name (UI + browser chrome). */
export const BRAND_NAME = "Taplite";

/** Public site and marketing domain. */
export const BRAND_DOMAIN = "taplite.store";

/** Short line for SEO + meta description. */
export const BRAND_TAGLINE =
  "Point-of-sale, stock, and billing for shops and counters — built for taplite.store.";

/** Logos in `/public`: `light` = white theme, `dark` = black/dark theme. */
export const BRAND_LOGO = {
  light: "/white_v.png",
  dark: "/black_v.png",
} as const;

export const BRAND_FAVICON = "/favicon.png";

/**
 * Public URL for the Android app (Google Play, internal APK page, etc.).
 * Set `NEXT_PUBLIC_ANDROID_APP_URL` in the web app environment.
 */
export function getAndroidAppUrl(): string {
  const u = process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim();
  return u && u.length > 0 ? u : "";
}
