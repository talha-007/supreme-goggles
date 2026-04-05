require("dotenv").config({ path: ".env" });

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      "expo-image-picker",
      {
        photosPermission: "Allow POS Mobile to access your photos for product images.",
        cameraPermission: "Allow POS Mobile to take photos for product images.",
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
  },
});
