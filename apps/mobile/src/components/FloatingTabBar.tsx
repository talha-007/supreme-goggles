import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Pill-shaped tab bar with horizontal inset and shadow so it reads as “floating”.
 * Kept in normal layout flow (not position:absolute) so BottomTabBar measures width/height correctly.
 */
export function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.outer, { paddingBottom: bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  pill: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 28,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#262626",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
});
