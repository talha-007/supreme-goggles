import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  /** Screen reader label */
  accessibilityLabel?: string;
};

/**
 * Full-width search used below the nav header — keeps scan/search at the top (thumb-friendly, not floating mid-screen).
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
  accessibilityLabel = "Search",
}: Props) {
  return (
    <View className="flex-row items-center rounded-2xl border border-neutral-800/90 bg-neutral-900/90 px-3 shadow-sm">
      <Ionicons name="search" size={20} color="#737373" accessibilityElementsHidden />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737373"
        accessibilityLabel={accessibilityLabel}
        className="min-h-[48px] flex-1 py-3 pl-2.5 text-base text-neutral-100"
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
          <Ionicons name="close-circle" size={22} color="#a3a3a3" />
        </Pressable>
      ) : null}
    </View>
  );
}
