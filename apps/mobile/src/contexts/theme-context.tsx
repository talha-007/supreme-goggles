import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme as useDeviceColorScheme } from "react-native";

const STORAGE_KEY = "app_theme_preference_v1";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  /** Resolved appearance used for UI. */
  resolved: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parsePreference(raw: string | null): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useDeviceColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      setPreferenceState(parsePreference(v));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: "light" | "dark" = useMemo(() => {
    if (preference === "light") return "light";
    if (preference === "dark") return "dark";
    return device === "light" ? "light" : "dark";
  }, [preference, device]);

  useEffect(() => {
    if (!ready) return;
    if (preference === "system") {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(preference);
    }
  }, [preference, ready]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      ready,
    }),
    [preference, resolved, setPreference, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export { BRAND_ACCENT_HEX, BRAND_PRIMARY_HEX } from "../theme/brand";
