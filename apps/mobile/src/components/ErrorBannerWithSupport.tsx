import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { openSupportWhatsApp, SUPPORT_PHONE_DISPLAY } from "../lib/support-contact";

type Props = {
  message: string;
  /** banner: list screens; compact: modals and tight layouts */
  variant?: "banner" | "compact";
};

export function ErrorBannerWithSupport({ message, variant = "banner" }: Props) {
  const isCompact = variant === "compact";

  return (
    <View
      className={
        isCompact
          ? "mb-2 rounded-xl border border-red-900/50 bg-red-950/50 px-3 py-2.5"
          : "mx-4 mt-3 rounded-xl border border-red-900/50 bg-red-950/50 px-3 py-3"
      }
    >
      <Text className="text-sm text-red-300" accessibilityRole="alert">
        {message}
      </Text>
      <Text
        className={
          isCompact ? "mt-1.5 text-[11px] leading-4 text-neutral-500" : "mt-2 text-xs leading-5 text-neutral-500"
        }
      >
        If this keeps happening, contact your shop admin. You can also message app support on WhatsApp (
        {SUPPORT_PHONE_DISPLAY}).
      </Text>
      <Pressable
        onPress={() => void openSupportWhatsApp()}
        className={
          isCompact
            ? "mt-2 flex-row items-center gap-2 self-start rounded-lg bg-emerald-600/15 px-2.5 py-1.5 active:opacity-90"
            : "mt-3 flex-row items-center justify-center gap-2 rounded-lg bg-emerald-600/20 py-2.5 active:opacity-90"
        }
        accessibilityRole="button"
        accessibilityLabel="Open WhatsApp to contact app support"
      >
        <Ionicons name="logo-whatsapp" size={isCompact ? 16 : 20} color="#34d399" />
        <Text className={`font-semibold text-emerald-400 ${isCompact ? "text-xs" : "text-sm"}`}>
          WhatsApp support
        </Text>
      </Pressable>
    </View>
  );
}
