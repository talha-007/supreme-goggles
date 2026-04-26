require("dotenv").config({ path: ".env" });

/**
 * Store / production (EAS):
 * - Set EXPO_PUBLIC_PRIVACY_POLICY_URL to your public policy page (https://…).
 * - Do NOT set EXPO_PUBLIC_DANGER_* overrides in App Store / Play production builds.
 * - EXPO_PUBLIC_SUBSCRIPTION_BYPASS / superadmin lists only apply in __DEV__ unless a DANGER override is set.
 */
module.exports = ({ config }) => ({
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
    /** Base URL for sign-up email confirmation links */
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.EXPO_PUBLIC_SITE_URL ??
      "http://localhost:3000",
    /** Public https URL for App Store / Play “Privacy policy” and in-app link; optional. */
    privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "",
  },
});
