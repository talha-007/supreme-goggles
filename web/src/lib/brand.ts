/** Product / company name (UI + browser chrome). */
export const BRAND_NAME = "Taplite";

/** Public site and marketing domain. */
export const BRAND_DOMAIN = "taplite.store";

/** Short line for SEO + meta description. */
export const BRAND_TAGLINE =
  "Point-of-sale, stock, and billing for shops and counters. Built for taplite.store.";

/** Logos in `/public`: `light` = white theme, `dark` = black/dark theme. */
export const BRAND_LOGO = {
  light: "/white_v.png",
  dark: "/black_v.png",
} as const;

export const BRAND_FAVICON = "/favicon.png";

/**
 * Public URL to download the Android app (APK or Play Store).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_ANDROID_APP_URL` if set (Play Store or any full URL).
 * 2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_ANDROID_APK_STORAGE_PATH` (defaults to
 *    `app-downloads/android/app-release.apk` in the public Storage bucket from migration
 *    `20260508120000_app_downloads_storage.sql`). Upload the APK in Supabase Dashboard → Storage.
 */
export function getAndroidAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim();
  if (explicit) return explicit;

  const rawBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const base =
    typeof rawBase === "string" && rawBase.trim().length > 0
      ? rawBase.trim().replace(/\/$/, "")
      : "";
  if (!base) return "";

  const path =
    process.env.NEXT_PUBLIC_ANDROID_APK_STORAGE_PATH?.trim() ||
    "app-downloads/android/app-release.apk";

  const normalized = path.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${normalized}`;
}
