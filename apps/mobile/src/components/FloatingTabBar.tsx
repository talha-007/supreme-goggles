import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { Keyboard, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/theme-context";

const KB_SHOW = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const KB_HIDE = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

/**
 * Pill-shaped tab bar with horizontal inset and shadow so it reads as “floating”.
 * Kept in normal layout flow (not position:absolute) so BottomTabBar measures width/height correctly.
 */
export function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  useEffect(() => {
    const show = Keyboard.addListener(KB_SHOW, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(KB_HIDE, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Custom tab bar + chrome is not always collapsed by `tabBarHideOnKeyboard`; hide while typing. */
  if (keyboardVisible) {
    return null;
  }

  return (
    <View style={[styles.outer, { paddingBottom: bottom }]} pointerEvents="box-none">
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark ? "#171717" : "#ffffff",
            borderColor: isDark ? "#262626" : "#e4e4e7",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.18 : 0.1,
                shadowRadius: 10,
              },
              android: { elevation: isDark ? 6 : 4 },
            }),
          },
        ]}
      >
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
    borderWidth: 1,
  },
});
