import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
const url = String(extra.supabaseUrl ?? "");
const anonKey = String(extra.supabaseAnonKey ?? "");

if (!url || !anonKey) {
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in app extra. Check app.config.js and .env.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    /** Email links must complete in the browser; PKCE verifier only exists on-device → use implicit (hash tokens). */
    flowType: "implicit",
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
