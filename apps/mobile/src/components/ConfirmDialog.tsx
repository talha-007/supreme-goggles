import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** Emerald primary (default) or destructive red */
  variant?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = "Cancel",
  confirmLabel,
  variant = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClasses =
    variant === "danger"
      ? "rounded-xl border border-red-900/60 bg-red-950/40 py-3.5 active:opacity-90 disabled:opacity-50"
      : "rounded-xl bg-emerald-600 py-3.5 active:opacity-90 disabled:opacity-50";

  const spinnerColor = variant === "danger" ? "#f87171" : "#ffffff";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          onPress={loading ? undefined : onCancel}
          className="absolute inset-0 bg-black/70"
        />
        <View
          className="z-10 w-[92%] max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 px-4 pb-4 pt-4"
          accessibilityViewIsModal
        >
          <Text className="text-lg font-semibold text-neutral-100">{title}</Text>
          <Text className="mt-2 text-sm leading-5 text-neutral-500">{message}</Text>

          <View className="mt-5 gap-3">
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={confirmClasses}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {loading ? (
                <ActivityIndicator color={spinnerColor} />
              ) : (
                <Text
                  className={`text-center text-base font-semibold ${
                    variant === "danger" ? "text-red-400" : "text-white"
                  }`}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onCancel}
              disabled={loading}
              className="rounded-xl bg-neutral-800 py-3.5 active:opacity-90 disabled:opacity-50"
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text className="text-center text-base font-medium text-neutral-100">{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
