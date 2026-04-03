import Constants from "expo-constants";

/** Email confirmation links open `${siteUrl}/auth/callback`. */
export function getEmailRedirectUrl(): string {
  const extra = Constants.expoConfig?.extra as { siteUrl?: string } | undefined;
  const raw =
    typeof extra?.siteUrl === "string" && extra.siteUrl.length > 0
      ? extra.siteUrl
      : "http://localhost:3000";
  const siteUrl = raw.replace(/\/$/, "");
  return `${siteUrl}/auth/callback`;
}
