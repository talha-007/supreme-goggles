require("dotenv").config({ path: ".env" });

/**
 * Store / production (EAS):
 * - Set EXPO_PUBLIC_PRIVACY_POLICY_URL to your hosted policy (https://…).
 * - If unset and siteUrl is http(s), defaults to `{origin}/privacy`.
 */
function derivePrivacyPolicyUrl(siteUrl, explicit) {
  const trimmed = String(explicit ?? "").trim();
  if (trimmed) return trimmed;
  const base = String(siteUrl ?? "").trim();
  if (!/^https?:\/\//i.test(base)) return "";
  try {
    const u = new URL(base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.pathname = "/privacy";
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    return "";
  }
}

module.exports = ({ config }) => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.EXPO_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const privacyPolicyUrl = derivePrivacyPolicyUrl(
    siteUrl,
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  );

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Taplite to access your photos for product images.",
          cameraPermission: "Allow Taplite to take photos for product images.",
        },
      ],
    ],
    extra: {
      ...config.extra,
      supabaseUrl:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
        "",
      siteUrl,
      privacyPolicyUrl,
    },
  };
};
