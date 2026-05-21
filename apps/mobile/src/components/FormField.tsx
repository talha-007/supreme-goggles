import { useState } from "react";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../contexts/theme-context";
import { formTextInputClass, textFieldLabelClass, textMutedClass, type FormInputVariant } from "../theme/semantic";

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
  const { resolved } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  const effectiveSecure = isPassword && showPasswordToggle ? !passwordVisible : secureTextEntry;
  const hasErr = Boolean(error);
  const showWarn = borderWarning && !hasErr;
  const inputVariant: FormInputVariant = hasErr ? "error" : showWarn ? "warning" : "normal";

  const input = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={resolved === "dark" ? "#737373" : "#71717a"}
      secureTextEntry={effectiveSecure}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      multiline={multiline}
      editable={editable}
      textAlignVertical={multiline ? "top" : "center"}
      className={`${formTextInputClass(resolved, inputVariant)} ${
        isPassword && showPasswordToggle ? "pl-4 pr-12" : "px-4"
      } py-3.5 ${multiline ? "min-h-[88px]" : ""} ${!editable ? "opacity-60" : ""}`}
    />
  );

  return (
    <View className="mb-4">
      <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>{label}</Text>
      {hint ? (
        <Text className={`mb-2 text-xs ${textMutedClass(resolved)}`} accessibilityRole="text">
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
              color={resolved === "dark" ? "#a3a3a3" : "#71717a"}
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
