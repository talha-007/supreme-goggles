import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { ErrorBannerWithSupport } from "../../src/components/ErrorBannerWithSupport";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProductThumbnail } from "../../src/components/ProductThumbnail";
import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import {
  deleteBusinessLogoByUrl,
  uploadBusinessLogoFromUri,
} from "../../src/lib/business-logo";
import { openSupportWhatsApp, SUPPORT_PHONE_DISPLAY } from "../../src/lib/support-contact";
import { supabase } from "../../src/lib/supabase";

export default function SettingsScreen() {
  const bottomPad = useTabScreenBottomPadding();
  const { user, businessId, signOut } = useAuth();
  const { prefs, setPrefs, prefsReady } = useRealtimeNotifications();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const [businessNameInput, setBusinessNameInput] = useState("");
  const [logoPublicUrl, setLogoPublicUrl] = useState<string | null>(null);
  const [pendingLogoUri, setPendingLogoUri] = useState<string | null>(null);
  const [pendingLogoMime, setPendingLogoMime] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null);
  const [canManageShop, setCanManageShop] = useState(false);
  const [taxRateStr, setTaxRateStr] = useState("0");
  const [invoiceDiscountStr, setInvoiceDiscountStr] = useState("0");
  const [lineDiscountPctStr, setLineDiscountPctStr] = useState("0");
  const [taxLabelStr, setTaxLabelStr] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [defaultsSavedAt, setDefaultsSavedAt] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    if (!businessId || !user?.id) return;
    setProfileLoading(true);
    setDefaultsError(null);
    setProfileSaveError(null);
    const [{ data: biz }, { data: mem }] = await Promise.all([
      supabase
        .from("businesses")
        .select(
          "name, logo_url, default_tax_rate, default_invoice_discount_amount, default_line_discount_pct, tax_label",
        )
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const row = biz as {
      name?: string;
      logo_url?: string | null;
      default_tax_rate?: number;
      default_invoice_discount_amount?: number;
      default_line_discount_pct?: number;
      tax_label?: string | null;
    } | null;
    setBusinessNameInput(row?.name != null ? String(row.name) : "");
    setLogoPublicUrl(row?.logo_url != null && String(row.logo_url).trim() ? String(row.logo_url).trim() : null);
    setPendingLogoUri(null);
    setPendingLogoMime(null);
    setRemoveLogo(false);
    const role = String(mem?.role ?? "");
    setCanManageShop(role === "owner" || role === "manager");
    const tr = row?.default_tax_rate;
    setTaxRateStr(tr != null && Number.isFinite(Number(tr)) ? String(Number(tr)) : "0");
    const disc = row?.default_invoice_discount_amount;
    setInvoiceDiscountStr(
      disc != null && Number.isFinite(Number(disc)) ? String(Number(disc)) : "0",
    );
    const line = row?.default_line_discount_pct;
    setLineDiscountPctStr(
      line != null && Number.isFinite(Number(line)) ? String(Number(line)) : "0",
    );
    setTaxLabelStr(row?.tax_label != null ? String(row.tax_label) : "");
    setProfileLoading(false);
  }, [businessId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const onSignOutPress = () => setSignOutOpen(true);

  const clearDefaultsSavedHint = useCallback(() => {
    setDefaultsSavedAt(null);
  }, []);

  const clearProfileSavedHint = useCallback(() => {
    setProfileSavedAt(null);
  }, []);

  const pickShopLogo = async () => {
    if (!canManageShop) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setProfileSaveError("Allow photo access in Settings to set the logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setProfileSaveError(null);
    setRemoveLogo(false);
    setPendingLogoUri(a.uri);
    setPendingLogoMime(a.mimeType ?? "image/jpeg");
    clearProfileSavedHint();
  };

  const onSaveShopProfile = async () => {
    if (!businessId || !canManageShop) return;
    const name = businessNameInput.trim();
    if (!name) {
      setProfileSaveError("Business name is required.");
      return;
    }
    setProfileSaveError(null);
    setSavingProfile(true);
    const previousLogo = logoPublicUrl;
    let nextLogoUrl: string | null = logoPublicUrl;
    let uploadedNewUrl: string | null = null;

    try {
      if (removeLogo) {
        nextLogoUrl = null;
      } else if (pendingLogoUri && pendingLogoMime) {
        const up = await uploadBusinessLogoFromUri(supabase, businessId, pendingLogoUri, pendingLogoMime);
        if ("error" in up) {
          setProfileSaveError(up.error);
          setSavingProfile(false);
          return;
        }
        uploadedNewUrl = up.url;
        nextLogoUrl = up.url;
      }

      const { error } = await supabase.rpc("update_business_profile_settings", {
        p_name: name,
        p_logo_url: nextLogoUrl ?? "",
      });

      if (error) {
        if (uploadedNewUrl) await deleteBusinessLogoByUrl(supabase, uploadedNewUrl);
        setProfileSaveError(error.message);
        setSavingProfile(false);
        return;
      }

      if (previousLogo && previousLogo !== nextLogoUrl) {
        await deleteBusinessLogoByUrl(supabase, previousLogo);
      }

      setProfileSaveError(null);
      setLogoPublicUrl(nextLogoUrl);
      setPendingLogoUri(null);
      setPendingLogoMime(null);
      setRemoveLogo(false);
      setBusinessNameInput(name);
      setProfileSavedAt(Date.now());
    } catch (e) {
      setProfileSaveError(e instanceof Error ? e.message : "Could not save shop profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveInvoiceDefaults = async () => {
    if (!businessId || !canManageShop) return;
    setDefaultsError(null);
    const tax = Number(String(taxRateStr).replace(",", ".").trim());
    const disc = Number(String(invoiceDiscountStr).replace(",", ".").trim());
    const linePct = Number(String(lineDiscountPctStr).replace(",", ".").trim());
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setDefaultsError("Tax rate must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(disc) || disc < 0) {
      setDefaultsError("Invoice discount cannot be negative.");
      return;
    }
    if (!Number.isFinite(linePct) || linePct < 0 || linePct > 100) {
      setDefaultsError("Line discount must be between 0 and 100.");
      return;
    }
    setSavingDefaults(true);
    const { error } = await supabase.rpc("update_business_invoice_defaults", {
      p_default_tax_rate: tax,
      p_default_invoice_discount_amount: disc,
      p_default_line_discount_pct: linePct,
      p_tax_label: taxLabelStr.trim(),
    });
    setSavingDefaults(false);
    if (error) {
      setDefaultsError(error.message);
      return;
    }
    setDefaultsSavedAt(Date.now());
    void loadProfile();
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-neutral-950"
        contentContainerClassName="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <Text className="text-base text-neutral-400">
          Account, shop info, and how the app tells you when data changes.
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
          Your shop
        </Text>
        <View className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
          {profileLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : (
            <>
              {!canManageShop ? (
                <Text className="mb-3 text-xs text-amber-200/90">
                  Only owners and managers can change the shop name or logo.
                </Text>
              ) : null}
              <FormField
                label="Business name"
                value={businessNameInput}
                onChangeText={(t) => {
                  clearProfileSavedHint();
                  setBusinessNameInput(t);
                }}
                placeholder="Your shop name"
                autoCapitalize="words"
                editable={canManageShop}
              />
              <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Logo</Text>
              <View className="flex-row items-center gap-4">
                <ProductThumbnail
                  imageUrl={
                    removeLogo
                      ? null
                      : pendingLogoUri ?? logoPublicUrl
                  }
                  size={72}
                />
                <View className="min-w-0 flex-1 gap-2">
                  <Pressable
                    onPress={() => void pickShopLogo()}
                    disabled={!canManageShop}
                    className="rounded-xl border border-emerald-700/50 bg-emerald-950/25 px-3 py-2.5 active:opacity-90 disabled:opacity-50"
                    accessibilityRole="button"
                    accessibilityLabel="Choose logo image"
                  >
                    <Text className="text-center text-sm font-semibold text-emerald-400">
                      {pendingLogoUri ? "Change chosen image" : "Choose image"}
                    </Text>
                  </Pressable>
                  {(logoPublicUrl || pendingLogoUri) && !removeLogo ? (
                    <Pressable
                      onPress={() => {
                        clearProfileSavedHint();
                        setRemoveLogo(true);
                        setPendingLogoUri(null);
                        setPendingLogoMime(null);
                      }}
                      disabled={!canManageShop}
                      className="rounded-xl border border-neutral-700 px-3 py-2.5 active:opacity-90 disabled:opacity-50"
                      accessibilityRole="button"
                      accessibilityLabel="Remove logo"
                    >
                      <Text className="text-center text-sm font-medium text-neutral-400">Remove logo</Text>
                    </Pressable>
                  ) : removeLogo ? (
                    <Pressable
                      onPress={() => {
                        clearProfileSavedHint();
                        setRemoveLogo(false);
                      }}
                      disabled={!canManageShop}
                      className="rounded-xl border border-neutral-700 px-3 py-2.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-center text-sm font-medium text-emerald-400">Undo remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text className="mt-2 text-xs text-neutral-600">
                Square crop is applied when you pick. Shown on receipts and PDFs where supported.
              </Text>
              {profileSaveError ? (
                <Text className="mt-2 text-sm text-red-400" accessibilityRole="alert">
                  {profileSaveError}
                </Text>
              ) : null}
              {profileSavedAt != null && !profileSaveError ? (
                <Text className="mt-2 text-sm text-emerald-400">Shop profile saved.</Text>
              ) : null}
              <PrimaryButton
                label={savingProfile ? "Saving…" : "Save shop name & logo"}
                onPress={() => void onSaveShopProfile()}
                loading={savingProfile}
                disabled={!canManageShop || profileLoading}
              />
            </>
          )}
        </View>

        <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          New bill defaults
        </Text>
        <Text className="mt-1 text-xs text-neutral-600">
          Used for Quick sale and new invoices. Invoice discount is a fixed PKR amount off each new bill; line discount
          is a default % on new lines.
        </Text>
        <View className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
          {profileLoading ? (
            <ActivityIndicator color="#34d399" />
          ) : (
            <>
              {!canManageShop ? (
                <Text className="mb-3 text-xs text-amber-200/90">
                  Only owners and managers can change tax and discount defaults. Ask your shop owner if you need this
                  updated.
                </Text>
              ) : null}
              <FormField
                label="Default tax rate (%)"
                value={taxRateStr}
                onChangeText={(t) => {
                  clearDefaultsSavedHint();
                  setTaxRateStr(t);
                }}
                placeholder="0"
                keyboardType="decimal-pad"
                editable={canManageShop}
              />
              <FormField
                label="Default invoice discount (PKR)"
                value={invoiceDiscountStr}
                onChangeText={(t) => {
                  clearDefaultsSavedHint();
                  setInvoiceDiscountStr(t);
                }}
                placeholder="0"
                keyboardType="decimal-pad"
                editable={canManageShop}
              />
              <FormField
                label="Default line discount (%)"
                value={lineDiscountPctStr}
                onChangeText={(t) => {
                  clearDefaultsSavedHint();
                  setLineDiscountPctStr(t);
                }}
                placeholder="0"
                keyboardType="decimal-pad"
                editable={canManageShop}
              />
              <Text className="-mt-2 mb-1 text-xs text-neutral-600">
                Applied as the starting line discount when you add lines to a new bill (0–100).
              </Text>
              <FormField
                label="Tax label (optional)"
                value={taxLabelStr}
                onChangeText={(t) => {
                  clearDefaultsSavedHint();
                  setTaxLabelStr(t);
                }}
                placeholder="e.g. GST, Sales tax"
                autoCapitalize="words"
                editable={canManageShop}
              />
              <Text className="-mt-2 mb-3 text-xs text-neutral-600">
                Shown on receipts and PDFs instead of a generic “Tax” label when set.
              </Text>
              {defaultsError ? <ErrorBannerWithSupport message={defaultsError} variant="compact" /> : null}
              {defaultsSavedAt != null && !defaultsError ? (
                <Text className="mb-2 text-sm text-emerald-400">Saved.</Text>
              ) : null}
              <PrimaryButton
                label={savingDefaults ? "Saving…" : "Save bill defaults"}
                onPress={() => void onSaveInvoiceDefaults()}
                loading={savingDefaults}
                disabled={!canManageShop || profileLoading}
              />
            </>
          )}
        </View>

        <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Live data and alerts
        </Text>
        <Text className="mt-1 text-xs text-neutral-600">
          When someone else saves a bill or edits stock, your phone can refresh lists and optionally buzz.
        </Text>

        {!prefsReady ? (
          <View className="mt-4 py-4">
            <ActivityIndicator color="#34d399" />
          </View>
        ) : (
          <View className="mt-4 gap-4">
            <View className="flex-row items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
              <View className="min-w-0 flex-1 pr-2">
                <Text className="text-base font-medium text-neutral-100">Live updates</Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Listen for changes to bills and products for this shop.
                </Text>
              </View>
              <Switch
                value={prefs.realtimeEnabled}
                onValueChange={(v) => void setPrefs({ realtimeEnabled: v })}
                trackColor={{ false: "#404040", true: "#065f46" }}
                thumbColor={prefs.realtimeEnabled ? "#34d399" : "#a3a3a3"}
              />
            </View>

            <View className="flex-row items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
              <View className="min-w-0 flex-1 pr-2">
                <Text className="text-base font-medium text-neutral-100">Banner message</Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Show a short notice at the top when data changes.
                </Text>
              </View>
              <Switch
                value={prefs.showBannerOnChange}
                onValueChange={(v) => void setPrefs({ showBannerOnChange: v })}
                disabled={!prefs.realtimeEnabled}
                trackColor={{ false: "#404040", true: "#065f46" }}
                thumbColor={prefs.showBannerOnChange ? "#34d399" : "#a3a3a3"}
              />
            </View>

            <View className="flex-row items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3">
              <View className="min-w-0 flex-1 pr-2">
                <Text className="text-base font-medium text-neutral-100">Buzz on alert</Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Short vibration when lists refresh after a change.
                </Text>
              </View>
              <Switch
                value={prefs.vibrateOnNotify}
                onValueChange={(v) => void setPrefs({ vibrateOnNotify: v })}
                disabled={!prefs.realtimeEnabled}
                trackColor={{ false: "#404040", true: "#065f46" }}
                thumbColor={prefs.vibrateOnNotify ? "#34d399" : "#a3a3a3"}
              />
            </View>
          </View>
        )}

        <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Help and support
        </Text>
        <Text className="mt-1 text-xs text-neutral-600">
          Problems with the app, billing, or sign-in — contact your shop admin first, then message app support if you
          still need help.
        </Text>
        <Pressable
          onPress={() => void openSupportWhatsApp()}
          accessibilityRole="button"
          accessibilityLabel="Open WhatsApp app support"
          className="mt-3 flex-row items-center gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/35 px-4 py-3.5 active:opacity-90"
        >
          <Ionicons name="logo-whatsapp" size={28} color="#4ade80" />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-emerald-400">WhatsApp support</Text>
            <Text className="mt-0.5 text-sm text-neutral-400">{SUPPORT_PHONE_DISPLAY}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>

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
