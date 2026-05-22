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
  const bottom = Math.max(insets.bottom, 8);
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
            backgroundColor: isDark ? "#141414" : "#ffffff",
            borderColor: "transparent",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.22 : 0.08,
                shadowRadius: 16,
              },
              android: { elevation: isDark ? 8 : 4 },
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
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: "transparent",
  },
  pill: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: 0,
    overflow: "hidden",
  },
});
