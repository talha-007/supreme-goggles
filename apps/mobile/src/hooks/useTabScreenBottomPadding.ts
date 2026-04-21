import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Floating pill tab bar + gap above home indicator / gesture bar. */
const FLOATING_TAB_BAR_ZONE = 92;

export function useTabScreenBottomPadding() {
  const insets = useSafeAreaInsets();
  return FLOATING_TAB_BAR_ZONE + insets.bottom;
}
