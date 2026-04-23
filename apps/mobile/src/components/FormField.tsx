import { useState } from "react";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label: string;
  /** Shown in smaller text under the label and above the input. */
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  /** When set with `secureTextEntry`, shows an eye control to show/hide the password. */
  showPasswordToggle?: boolean;
  /** Inline validation message (red border + text below). */
  error?: string | null;
  /** Amber border when e.g. sign-in failed and we show a field hint (not a format error). */
  borderWarning?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad" | "numeric";
  autoCapitalize?: TextInputProps["autoCapitalize"];
  multiline?: boolean;
  editable?: boolean;
};

export function FormField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showPasswordToggle = false,
  error,
  borderWarning = false,
  keyboardType = "default",
  autoCapitalize = "none",
  multiline = false,
  editable = true,
}: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  const effectiveSecure = isPassword && showPasswordToggle ? !passwordVisible : secureTextEntry;
  const hasErr = Boolean(error);
  const showWarn = borderWarning && !hasErr;

  const input = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#737373"
      secureTextEntry={effectiveSecure}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      multiline={multiline}
      editable={editable}
      textAlignVertical={multiline ? "top" : "center"}
      className={`rounded-xl border bg-neutral-900 text-base text-neutral-100 ${
        hasErr
          ? "border-rose-500/80"
          : showWarn
            ? "border-amber-500/80"
            : "border-neutral-800"
      } ${isPassword && showPasswordToggle ? "pl-4 pr-12" : "px-4"} py-3.5 ${
        multiline ? "min-h-[88px]" : ""
      } ${!editable ? "opacity-60" : ""}`}
    />
  );

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-neutral-300">{label}</Text>
      {hint ? (
        <Text className="mb-2 text-xs text-neutral-500" accessibilityRole="text">
          {hint}
        </Text>
      ) : null}
      {isPassword && showPasswordToggle ? (
        <View className="relative">
          {input}
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={8}
            className="absolute right-2 top-0 bottom-0 justify-center"
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#a3a3a3"
            />
          </Pressable>
        </View>
      ) : (
        input
      )}
      {error ? (
        <Text className="mt-1.5 text-sm text-rose-400" accessibilityRole="text">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
