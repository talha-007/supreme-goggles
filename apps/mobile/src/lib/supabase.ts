import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { runtimeConfig } from "../config/runtime-config";

const url = runtimeConfig.supabaseUrl;
const anonKey = runtimeConfig.supabaseAnonKey;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

function getOrCreateClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Missing Supabase config in release build. Run: npm run prebuild:apk:release (requires apps/mobile/.env)",
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        /** Email links must complete in the browser; PKCE verifier only exists on-device → use implicit (hash tokens). */
        flowType: "implicit",
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Lazy Supabase client — avoids crashing the whole app at import time in misconfigured release builds. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getOrCreateClient();
    const value = Reflect.get(c, prop, receiver);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
