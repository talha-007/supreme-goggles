import Constants from "expo-constants";

/** `EXPO_PUBLIC_PRIVACY_POLICY_URL` at build time (e.g. https://yoursite.com/privacy). */
export function getPrivacyPolicyUrl(): string {
  const extra = Constants.expoConfig?.extra as { privacyPolicyUrl?: string } | undefined;
  return String(extra?.privacyPolicyUrl ?? "").trim();
}

/** Short, store-disclosure style copy (English). Shown in Settings; link optional. */
export const IN_APP_DATA_PROCESSING_SUMMARY = `This app connects to your shop’s account to:
• sign you in and keep your session secure;
• load and update bills, products, customers, and settings for your business;
• optionally use the camera/photo library if you add product or logo images;
• use optional WhatsApp to contact support.

Data is stored with your service provider; ask your shop admin for full details.`;
