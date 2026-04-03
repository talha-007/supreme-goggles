import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";

export default function SettingsScreen() {
  const bottomPad = useTabScreenBottomPadding();
  const { user, signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const onSignOutPress = () => setSignOutOpen(true);

  return (
    <>
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerClassName="px-4 pt-4"
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      <Text className="text-base text-neutral-400">
        Account and preferences for your store.
      </Text>

      {user?.email ? (
        <View className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
          <Text className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Signed in as
          </Text>
          <Text className="mt-1 text-base text-neutral-100">{user.email}</Text>
        </View>
      ) : null}

      <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Account
      </Text>
      <Pressable
        onPress={onSignOutPress}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        className="mt-3 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3.5 active:opacity-90"
      >
        <Text className="text-center text-base font-semibold text-red-400">Sign out</Text>
      </Pressable>
    </ScrollView>

    <ConfirmDialog
      visible={signOutOpen}
      title="Sign out"
      message="Are you sure you want to sign out?"
      cancelLabel="Cancel"
      confirmLabel="Sign out"
      variant="danger"
      onCancel={() => setSignOutOpen(false)}
      onConfirm={() => {
        setSignOutOpen(false);
        void signOut();
      }}
    />
    </>
  );
}
