function truthy(v: string | undefined): boolean {
  if (!v?.trim()) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function isReactNativeDevBuild(): boolean {
  return Boolean(
    typeof globalThis !== "undefined" && (globalThis as { __DEV__?: boolean }).__DEV__,
  );
}

/**
 * Subscription/superadmin env bypasses are honored in dev (Expo / debug) only, unless
 * the explicit "danger" release override is set for internal testing. Store builds
 * should never set the override.
 */
export function allowSubscriptionBypassFromEnvInThisBuild(): boolean {
  if (isReactNativeDevBuild()) return true;
  return truthy(process.env.EXPO_PUBLIC_DANGER_ALLOW_SUBSCRIPTION_BYPASS_IN_RELEASE);
}

/**
 * `EXPO_PUBLIC_SUPERADMIN_USER_IDS` / `EXPO_PUBLIC_SUPERADMIN_EMAILS` apply only in dev
 * or when this release override is set.
 */
export function allowSuperadminBypassFromEnvInThisBuild(): boolean {
  if (isReactNativeDevBuild()) return true;
  return truthy(process.env.EXPO_PUBLIC_DANGER_ALLOW_SUPERADMIN_BYPASS_IN_RELEASE);
}
