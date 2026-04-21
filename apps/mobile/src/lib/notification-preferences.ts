import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPrefs = {
  /** Subscribe to live database changes for this shop (invoices, products). */
  realtimeEnabled: boolean;
  /** Show a short message at the top when data changes elsewhere. */
  showBannerOnChange: boolean;
  /** Short buzz when an alert fires (no extra app install). */
  vibrateOnNotify: boolean;
};

const DEFAULTS: NotificationPrefs = {
  realtimeEnabled: true,
  showBannerOnChange: true,
  vibrateOnNotify: true,
};

const KEYS = {
  realtime: "pos_prefs_realtime_v1",
  banner: "pos_prefs_banner_v1",
  vibrate: "pos_prefs_vibrate_v1",
} as const;

function parseBool(v: string | null, defaultTrue: boolean): boolean {
  if (v === null || v === undefined) return defaultTrue;
  return v === "1";
}

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const [a, b, c] = await Promise.all([
      AsyncStorage.getItem(KEYS.realtime),
      AsyncStorage.getItem(KEYS.banner),
      AsyncStorage.getItem(KEYS.vibrate),
    ]);
    return {
      realtimeEnabled: parseBool(a, DEFAULTS.realtimeEnabled),
      showBannerOnChange: parseBool(b, DEFAULTS.showBannerOnChange),
      vibrateOnNotify: parseBool(c, DEFAULTS.vibrateOnNotify),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveNotificationPrefs(patch: Partial<NotificationPrefs>): Promise<void> {
  const entries: [string, string][] = [];
  if (patch.realtimeEnabled !== undefined) {
    entries.push([KEYS.realtime, patch.realtimeEnabled ? "1" : "0"]);
  }
  if (patch.showBannerOnChange !== undefined) {
    entries.push([KEYS.banner, patch.showBannerOnChange ? "1" : "0"]);
  }
  if (patch.vibrateOnNotify !== undefined) {
    entries.push([KEYS.vibrate, patch.vibrateOnNotify ? "1" : "0"]);
  }
  if (entries.length === 0) return;
  await AsyncStorage.multiSet(entries);
}
