import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRealtimeNotifications } from "../contexts/realtime-notifications-context";

/**
 * Dismissible strip when Supabase Realtime reports invoice/product changes.
 */
export function RealtimeUpdateBanner() {
  const insets = useSafeAreaInsets();
  const { bannerMessage, dismissBanner } = useRealtimeNotifications();

  if (!bannerMessage) return null;

  return (
    <View
      className="absolute left-0 right-0 border-b border-emerald-900/50 bg-emerald-950/95 px-3 py-2.5"
      style={{ top: insets.top, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="cloud-download-outline" size={18} color="#6ee7b7" />
        <Text className="min-w-0 flex-1 text-xs leading-4 text-emerald-100">{bannerMessage}</Text>
        <Pressable
          onPress={dismissBanner}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss update notice"
        >
          <Ionicons name="close" size={22} color="#a7f3d0" />
        </Pressable>
      </View>
    </View>
  );
}
