import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRealtimeNotifications } from "../contexts/realtime-notifications-context";
import { useTheme } from "../contexts/theme-context";
import { BRAND_ACCENT_HEX } from "../theme/brand";
import { realtimeBannerClass, realtimeBannerTextClass } from "../theme/semantic";

/**
 * Dismissible strip when Supabase Realtime reports invoice/product changes.
 */
export function RealtimeUpdateBanner() {
  const insets = useSafeAreaInsets();
  const { bannerMessage, dismissBanner } = useRealtimeNotifications();
  const { resolved } = useTheme();

  if (!bannerMessage) return null;

  return (
    <View
      className={realtimeBannerClass(resolved)}
      style={{ top: insets.top, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="cloud-download-outline" size={18} color={BRAND_ACCENT_HEX} />
        <Text className={realtimeBannerTextClass(resolved)}>{bannerMessage}</Text>
        <Pressable
          onPress={dismissBanner}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss update notice"
        >
          <Ionicons name="close" size={22} color={BRAND_ACCENT_HEX} />
        </Pressable>
      </View>
    </View>
  );
}
