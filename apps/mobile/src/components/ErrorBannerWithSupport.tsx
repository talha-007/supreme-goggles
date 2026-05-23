import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { BRAND_ACCENT_HEX } from "../theme/brand";

import { useTheme } from "../contexts/theme-context";
import { openSupportWhatsApp, SUPPORT_PHONE_DISPLAY } from "../lib/support-contact";

type Props = {
  message: string;
  /** banner: list screens; compact: modals and tight layouts */
  variant?: "banner" | "compact";
};

export function ErrorBannerWithSupport({ message, variant = "banner" }: Props) {
  const isCompact = variant === "compact";
  const { resolved } = useTheme();
  const containerClass =
    resolved === "dark"
      ? "border-red-900/50 bg-red-950/50"
      : "border-red-300 bg-red-50";
  const messageClass = resolved === "dark" ? "text-red-300" : "text-red-800";
  const hintClass = resolved === "dark" ? "text-neutral-400" : "text-zinc-700";
  const ctaClass =
    resolved === "dark" ? "bg-brand-600/20" : "bg-brand-100";
  const ctaTextClass = resolved === "dark" ? "text-brand-300" : "text-brand-800";

  return (
    <View
      className={
        isCompact
          ? `mb-2 rounded-xl border px-3 py-2.5 ${containerClass}`
          : `mx-4 mt-3 rounded-xl border px-3 py-3 ${containerClass}`
      }
    >
      <Text className={`text-sm ${messageClass}`} accessibilityRole="alert">
        {message}
      </Text>
      <Text
        className={
          isCompact
            ? `mt-1.5 text-[11px] leading-4 ${hintClass}`
            : `mt-2 text-xs leading-5 ${hintClass}`
        }
      >
        If this keeps happening, contact your shop admin. You can also message app support on WhatsApp (
        {SUPPORT_PHONE_DISPLAY}).
      </Text>
      <Pressable
        onPress={() => void openSupportWhatsApp()}
        className={
          isCompact
            ? `mt-2 flex-row items-center gap-2 self-start rounded-lg px-2.5 py-1.5 active:opacity-90 ${ctaClass}`
            : `mt-3 flex-row items-center justify-center gap-2 rounded-lg py-2.5 active:opacity-90 ${ctaClass}`
        }
        accessibilityRole="button"
        accessibilityLabel="Open WhatsApp to contact app support"
      >
        <Ionicons name="logo-whatsapp" size={isCompact ? 16 : 20} color={BRAND_ACCENT_HEX} />
        <Text className={`font-semibold ${ctaTextClass} ${isCompact ? "text-xs" : "text-sm"}`}>
          WhatsApp support
        </Text>
      </Pressable>
    </View>
  );
}
