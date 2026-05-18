/** Product / company name (UI + browser chrome). */
export const BRAND_NAME = "Taplite";

/** Public site and marketing domain. */
export const BRAND_DOMAIN = "taplite.store";

/** Short line for SEO + meta description. */
export const BRAND_TAGLINE =
  "Point-of-sale, stock, and billing for shops and counters. Built for taplite.store.";

/**
 * Brand mark in `/public` (Obic / full logo). Authored for dark backgrounds; app uses
 * `BrandLogo` so it sits on a small dark tile on light pages. Open Graph still references this URL.
 */
export const BRAND_LOGO = {
  dark: "/taplite_obic.png",
} as const;

/**
 * Tab icon path. The actual file must live at `src/app/favicon.ico` (Next App Router
 * convention) so the `<link rel="icon">` stays same-origin. Do not set `icons` in
 * metadata with only this path while `metadataBase` is a production URL — Next would
 * resolve it to that host and break the icon on localhost.
 */
export const BRAND_FAVICON = "/favicon.ico";

/** Primary UI / marketing accent (`brand-*` in Tailwind; scale in `globals.css`). */
export const BRAND_PRIMARY_HEX = "#3A09B0" as const;

/**
 * Public URL to download the Android app (APK or Play Store).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_ANDROID_APP_URL` if set (Play Store or any full URL).
 * 2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_ANDROID_APK_STORAGE_PATH` (defaults to
 *    `app-downloads/Taplite.apk` in the public Storage bucket (object key is case-sensitive).
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
    "app-downloads/Taplite.apk";

  const normalized = path.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${normalized}`;
}
