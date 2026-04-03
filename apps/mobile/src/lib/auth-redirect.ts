import Constants from "expo-constants";

/** Same pattern as web: `${NEXT_PUBLIC_SITE_URL}/auth/callback` */
export function getEmailRedirectUrl(): string {
  const extra = Constants.expoConfig?.extra as { siteUrl?: string } | undefined;
  const raw =
    typeof extra?.siteUrl === "string" && extra.siteUrl.length > 0
      ? extra.siteUrl
      : "http://localhost:3000";
  const siteUrl = raw.replace(/\/$/, "");
  return `${siteUrl}/auth/callback`;
}
