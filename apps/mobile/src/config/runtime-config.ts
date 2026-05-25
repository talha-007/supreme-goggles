import Constants from "expo-constants";

import { embeddedEnv } from "./embedded-env.generated";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  siteUrl?: string;
};

function readEmbeddedExtra(): Extra {
  const c = Constants as typeof Constants & {
    manifest2?: { extra?: Extra };
    manifest?: { extra?: Extra };
  };
  return c.expoConfig?.extra ?? c.manifest2?.extra ?? c.manifest?.extra ?? {};
}

const extra = readEmbeddedExtra();

export const runtimeConfig = {
  supabaseUrl:
    embeddedEnv.supabaseUrl ||
    String(extra.supabaseUrl ?? "") ||
    "https://qqplffyjlpdhqwegbtea.supabase.co",
  supabaseAnonKey: embeddedEnv.supabaseAnonKey || String(extra.supabaseAnonKey ?? ""),
  siteUrl:
    embeddedEnv.siteUrl || String(extra.siteUrl ?? "") || "https://www.taplite.store",
};
