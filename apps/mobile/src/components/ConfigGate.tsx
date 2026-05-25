import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { isSupabaseConfigured } from "../lib/supabase";
import { openSupportWhatsApp, SUPPORT_PHONE_DISPLAY } from "../lib/support-contact";
import { screenRootClass, textMutedClass, textPageTitleClass, textSubtleClass } from "../theme/semantic";

type Props = { children: ReactNode };

export function ConfigGate({ children }: Props) {
  if (isSupabaseConfigured()) {
    return children;
  }

  const resolved = "dark" as const;
  return (
    <View className={`${screenRootClass(resolved)} items-center justify-center px-6`}>
      <Ionicons name="warning-outline" size={40} color="#f59e0b" />
      <Text className={`mt-4 text-center text-lg font-semibold ${textPageTitleClass(resolved)}`}>
        App setup incomplete
      </Text>
      <Text className={`mt-3 text-center text-sm leading-5 ${textSubtleClass(resolved)}`}>
        This build is missing Supabase connection settings. Reinstall a release APK built with{" "}
        <Text className={textMutedClass(resolved)}>npm run build:apk:release:clean</Text>, or contact support on
        WhatsApp ({SUPPORT_PHONE_DISPLAY}).
      </Text>
      <Pressable
        onPress={() => void openSupportWhatsApp("Taplite app shows missing Supabase config on launch.")}
        className="mt-6 flex-row items-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 active:opacity-90"
        accessibilityRole="button"
        accessibilityLabel="Open WhatsApp support"
      >
        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
        <Text className="text-base font-semibold text-white">WhatsApp support</Text>
      </Pressable>
    </View>
  );
}
