import { ActivityIndicator, Pressable, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, loading }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="mt-2 rounded-xl bg-emerald-600 px-4 py-4 active:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-center text-base font-semibold text-white">
          {label}
        </Text>
      )}
    </Pressable>
  );
}
