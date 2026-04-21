import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { openSupportWhatsApp } from "../lib/support-contact";

/** Compact WhatsApp control for stack / tab headers (trailing edge). */
export function SupportHeaderButton() {
  return (
    <Pressable
      onPress={() => void openSupportWhatsApp()}
      hitSlop={10}
      className="rounded-full bg-emerald-500/12 p-2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel="WhatsApp app support"
    >
      <Ionicons name="logo-whatsapp" size={22} color="#4ade80" />
    </Pressable>
  );
}

/** Places the primary header action (e.g. Add) with support on the outer trailing edge. */
export function headerRightWithSupport(primaryAction: ReactNode) {
  return (
    <View className="mr-1 flex-row items-center gap-1.5">
      {primaryAction}
      <SupportHeaderButton />
    </View>
  );
}
