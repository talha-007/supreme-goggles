import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Vibration } from "react-native";

import { useAuth } from "./auth-context";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "../lib/notification-preferences";
import { supabase } from "../lib/supabase";

type RealtimeCtx = {
  refreshGeneration: number;
  bannerMessage: string | null;
  dismissBanner: () => void;
  prefs: NotificationPrefs;
  setPrefs: (patch: Partial<NotificationPrefs>) => Promise<void>;
  prefsReady: boolean;
};

const RealtimeNotificationsContext = createContext<RealtimeCtx | null>(null);

const BANNER_TEXT =
  "Bills or stock were updated (maybe from another device). Lists were refreshed.";

export function RealtimeNotificationsProvider({ children }: { children: ReactNode }) {
  const { businessId } = useAuth();
  const [prefs, setPrefsState] = useState<NotificationPrefs>({
    realtimeEnabled: true,
    showBannerOnChange: true,
    vibrateOnNotify: true,
  });
  const [prefsReady, setPrefsReady] = useState(false);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const p = await loadNotificationPrefs();
      if (!cancelled) {
        setPrefsState(p);
        setPrefsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPrefs = useCallback(async (patch: Partial<NotificationPrefs>) => {
    await saveNotificationPrefs(patch);
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const dismissBanner = useCallback(() => setBannerMessage(null), []);

  const scheduleBump = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const p = prefsRef.current;
      if (p.vibrateOnNotify && AppState.currentState === "active") {
        Vibration.vibrate(120);
      }
      if (p.showBannerOnChange) {
        setBannerMessage(BANNER_TEXT);
      }
      setRefreshGeneration((g) => g + 1);
    }, 1600);
  }, []);

  useEffect(() => {
    if (!businessId || !prefsReady || !prefs.realtimeEnabled) {
      return;
    }

    const filter = `business_id=eq.${businessId}`;

    const channel = supabase
      .channel(`mobile-biz:${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices", filter },
        () => scheduleBump(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter },
        () => scheduleBump(),
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [businessId, prefs.realtimeEnabled, prefsReady, scheduleBump]);

  const value = useMemo(
    () => ({
      refreshGeneration,
      bannerMessage,
      dismissBanner,
      prefs,
      setPrefs,
      prefsReady,
    }),
    [refreshGeneration, bannerMessage, dismissBanner, prefs, setPrefs, prefsReady],
  );

  return (
    <RealtimeNotificationsContext.Provider value={value}>
      {children}
    </RealtimeNotificationsContext.Provider>
  );
}

export function useRealtimeNotifications(): RealtimeCtx {
  const ctx = useContext(RealtimeNotificationsContext);
  if (!ctx) {
    throw new Error("useRealtimeNotifications must be used within RealtimeNotificationsProvider");
  }
  return ctx;
}
