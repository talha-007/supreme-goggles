import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";

import { useTheme } from "../contexts/theme-context";
import { searchBarWrapClass, textStrongOnSurfaceClass } from "../theme/semantic";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  /** Screen reader label */
  accessibilityLabel?: string;
};

/**
 * Full-width search used below the nav header - keeps scan/search at the top (thumb-friendly, not floating mid-screen).
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
  accessibilityLabel = "Search",
}: Props) {
  const { resolved } = useTheme();
  const iconMuted = resolved === "dark" ? "#737373" : "#71717a";
  const iconSubtle = resolved === "dark" ? "#a3a3a3" : "#a1a1aa";
  return (
    <View className={searchBarWrapClass(resolved)}>
      <Ionicons name="search" size={20} color={iconMuted} accessibilityElementsHidden />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconMuted}
        accessibilityLabel={accessibilityLabel}
        className={`min-h-[48px] flex-1 py-3 pl-2.5 text-base ${textStrongOnSurfaceClass(resolved)}`}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="p-1"
        >
          <Ionicons name="close-circle" size={22} color={iconSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}
