import { Text, TextInput, type TextInputProps, View } from "react-native";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "decimal-pad" | "numeric";
  autoCapitalize?: TextInputProps["autoCapitalize"];
  multiline?: boolean;
  editable?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  multiline = false,
  editable = true,
}: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-neutral-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#737373"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        editable={editable}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-base text-neutral-100 ${
          multiline ? "min-h-[88px]" : ""
        } ${!editable ? "opacity-60" : ""}`}
      />
    </View>
  );
}
