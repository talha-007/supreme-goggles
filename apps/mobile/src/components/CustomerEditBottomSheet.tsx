import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { BRAND_ACCENT_HEX } from "../theme/brand";

import { useTheme } from "../contexts/theme-context";
import {
  bottomSheetContainerClass,
  chipInactiveBorder,
  chipInactiveText,
  hairlineBorderTClass,
  insetPanelRowClass,
  modalSecondaryButtonClass,
  textFieldLabelClass,
  textMutedClass,
  textSectionBodyClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
} from "../theme/semantic";
import { ConfirmDialog } from "./ConfirmDialog";
import { ErrorBannerWithSupport } from "./ErrorBannerWithSupport";
import { FormField } from "./FormField";
import { PrimaryButton } from "./PrimaryButton";
import { moneyCents, normalizeCustomer, roundMoney } from "../lib/customers-normalize";
import { formatPkr } from "../lib/format-money";
import { supabase } from "../lib/supabase";
import {
  CUSTOMER_TYPES,
  type CustomerRow,
  type CustomerType,
  customerTypeLabel,
} from "../types/customer";
import type { InvoiceStatus } from "../types/invoice";

const INVOICES_PAGE_SIZE = 20;

type InvoiceListRow = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total_amount: number;
  paid_amount: number;
  created_at: string;
};

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function statusLabel(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: "Draft",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    cancelled: "Cancelled",
  };
  return map[s] ?? s;
}

function statusBadgeClass(s: InvoiceStatus, resolved: "light" | "dark"): string {
  if (s === "cancelled") return "bg-red-950 text-red-400";
  if (s === "paid") return resolved === "dark" ? "bg-brand-950 text-brand-400" : "bg-brand-100 text-brand-800";
  if (s === "draft") return resolved === "dark" ? "bg-neutral-800 text-neutral-400" : "bg-zinc-200 text-zinc-600";
  if (s === "partial") return resolved === "dark" ? "bg-sky-950 text-sky-400" : "bg-sky-100 text-sky-800";
  return resolved === "dark" ? "bg-amber-950 text-amber-400" : "bg-amber-100 text-amber-800";
}

export type CustomerEditBottomSheetProps = {
  visible: boolean;
  customer: CustomerRow | null;
  businessId: string | null;
  isOwner: boolean;
  onClose: () => void;
  onCustomerUpdated: (row: CustomerRow) => void;
  onCustomerDeleted: () => void;
};

export function CustomerEditBottomSheet({
  visible,
  customer,
  businessId,
  isOwner,
  onClose,
  onCustomerUpdated,
  onCustomerDeleted,
}: CustomerEditBottomSheetProps) {
  const { resolved } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<CustomerType>("retail");
  const [creditLimit, setCreditLimit] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [invRows, setInvRows] = useState<InvoiceListRow[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [invLoading, setInvLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setType(customer.type);
    setCreditLimit(String(customer.credit_limit ?? 0));
    setOutstanding(String(customer.outstanding_balance ?? 0));
    setNotes(customer.notes ?? "");
    setIsActive(customer.is_active);
    setSaveError(null);
    setInvPage(1);
  }, [customer]);

  const loadInvoices = useCallback(async () => {
    if (!customer || !businessId) return;
    setInvLoading(true);
    const countRes = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("customer_id", customer.id);

    if (countRes.error) {
      setInvRows([]);
      setInvTotal(0);
      setInvLoading(false);
      return;
    }

    const total = countRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / INVOICES_PAGE_SIZE));
    const page = Math.min(invPage, totalPages);

    if (page !== invPage) {
      setInvTotal(total);
      setInvPage(page);
      setInvLoading(false);
      return;
    }

    const from = (page - 1) * INVOICES_PAGE_SIZE;
    const to = from + INVOICES_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total_amount, paid_amount, created_at")
      .eq("business_id", businessId)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      setInvRows([]);
      setInvTotal(0);
    } else {
      setInvTotal(total);
      setInvRows((data ?? []) as InvoiceListRow[]);
    }
    setInvLoading(false);
  }, [customer, businessId, invPage]);

  useEffect(() => {
    if (!visible || !customer || !businessId) return;
    void loadInvoices();
  }, [visible, customer, businessId, loadInvoices]);

  const totalInvPages = useMemo(
    () => Math.max(1, Math.ceil(invTotal / INVOICES_PAGE_SIZE)),
    [invTotal],
  );

  const onSave = async () => {
    if (!customer || !businessId) return;
    const n = name.trim();
    if (!n) {
      setSaveError("Name is required.");
      return;
    }
    const creditRaw = creditLimit.trim();
    const credit = creditRaw === "" ? 0 : Number(String(creditRaw).replace(/,/g, ""));
    if (!Number.isFinite(credit) || credit < 0) {
      setSaveError("Enter a valid credit limit.");
      return;
    }
    const obRaw = outstanding.trim();
    const ob = obRaw === "" ? 0 : Number(String(obRaw).replace(/,/g, ""));
    if (!Number.isFinite(ob)) {
      setSaveError("Enter a valid outstanding balance.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: n,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        type,
        credit_limit: roundMoney(credit),
        outstanding_balance: roundMoney(ob),
        notes: notes.trim() || null,
        is_active: isActive,
      })
      .eq("id", customer.id)
      .eq("business_id", businessId)
      .select("*")
      .maybeSingle();

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    if (data) {
      onCustomerUpdated(normalizeCustomer(data as Record<string, unknown>));
    }
    void loadInvoices();
  };

  const onConfirmDelete = async () => {
    if (!customer || !businessId || !isOwner) return;
    if (moneyCents(customer.outstanding_balance) !== 0) {
      return;
    }
    setDeleteBusy(true);
    const { error: unlinkErr } = await supabase
      .from("invoices")
      .update({ customer_id: null })
      .eq("business_id", businessId)
      .eq("customer_id", customer.id);

    if (unlinkErr) {
      setDeleteBusy(false);
      setSaveError(unlinkErr.message);
      setDeleteOpen(false);
      return;
    }

    const { error: delErr } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id)
      .eq("business_id", businessId);

    setDeleteBusy(false);
    setDeleteOpen(false);
    if (delErr) {
      setSaveError(delErr.message);
      return;
    }
    onCustomerDeleted();
    onClose();
  };

  const openInvoiceInTab = (invoiceId: string) => {
    onClose();
    router.push({
      pathname: "/invoices",
      params: { invoiceId, invoiceFocus: String(Date.now()) },
    });
  };

  const balanceBlocksDelete = customer ? moneyCents(customer.outstanding_balance) !== 0 : true;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[94%] px-4 pb-10 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            {customer ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className={`flex-1 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>Edit customer</Text>
                  <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color="#a3a3a3" />
                  </Pressable>
                </View>
                <Text className={`mt-1 text-sm ${textMutedClass(resolved)}`}>{customer.name}</Text>

                <View className="mt-5">
                  <FormField label="Name" value={name} onChangeText={setName} placeholder="Customer name" />
                  <FormField
                    label="Phone"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Optional"
                    keyboardType="phone-pad"
                  />
                  <FormField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Optional"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <FormField
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Optional"
                    multiline
                  />
                  <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                    contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
                  >
                    {CUSTOMER_TYPES.map((t) => {
                      const active = type === t.value;
                      return (
                        <Pressable
                          key={t.value}
                          onPress={() => setType(t.value)}
                          className={`mr-2 rounded-full border px-3 py-2 ${
                            active ? "border-brand-500 bg-brand-500/15" : chipInactiveBorder(resolved)
                          }`}
                        >
                          <Text className={`text-sm ${active ? "text-brand-400" : chipInactiveText(resolved)}`}>
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <FormField
                    label="Credit limit (PKR)"
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                  <FormField
                    label="Outstanding balance (PKR)"
                    value={outstanding}
                    onChangeText={setOutstanding}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                  <Text className={`mb-1 text-xs leading-4 ${textMutedClass(resolved)}`}>
                    Set what they owe (e.g. cash lent). Credit sales and payments still update this when recorded on
                    invoices.
                  </Text>
                  <FormField
                    label="Notes"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Optional"
                    multiline
                  />
                  <View className={insetPanelRowClass(resolved)}>
                    <Text className={`text-sm font-medium ${textSectionBodyClass(resolved)}`}>Active</Text>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: "#404040", true: "#065f46" }}
                      thumbColor={isActive ? "BRAND_ACCENT_HEX" : "#a3a3a3"}
                    />
                  </View>
                </View>

                {saveError ? (
                  <View className="mt-4">
                    <ErrorBannerWithSupport message={saveError} variant="compact" />
                  </View>
                ) : null}

                <View className="mt-5">
                  <PrimaryButton label="Save changes" onPress={() => void onSave()} loading={saving} />
                </View>

                <View className={`mt-8 pt-6 ${hairlineBorderTClass(resolved)}`}>
                  <Text className={`text-sm font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>Invoices</Text>
                  <Text className={`mt-1 text-xs ${textMutedClass(resolved)}`}>
                    Tap a row to open it on the Invoices tab ({invTotal} total).
                  </Text>
                  {invLoading ? (
                    <View className="mt-4 items-center py-6">
                      <ActivityIndicator color={BRAND_ACCENT_HEX} />
                    </View>
                  ) : invTotal === 0 ? (
                    <Text className={`mt-4 text-sm ${textMutedClass(resolved)}`}>No invoices linked yet.</Text>
                  ) : (
                    <>
                      <View className="mt-3 gap-2">
                        {invRows.map((inv) => (
                          <Pressable
                            key={inv.id}
                            onPress={() => openInvoiceInTab(inv.id)}
                            className={insetPanelRowClass(resolved)}
                          >
                            <View className="min-w-0 flex-1 pr-2">
                              <Text className={`text-sm font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{inv.invoice_number}</Text>
                              <Text className={`mt-0.5 text-xs ${textMutedClass(resolved)}`}>{shortDate(inv.created_at)}</Text>
                            </View>
                            <View className="items-end">
                              <View className={`rounded-full px-2 py-0.5 ${statusBadgeClass(inv.status, resolved)}`}>
                                <Text className="text-[10px] font-semibold uppercase">{statusLabel(inv.status)}</Text>
                              </View>
                              <Text className={`mt-1 text-xs tabular-nums ${textSubtleClass(resolved)}`}>
                                {formatPkr(Number(inv.total_amount))}
                              </Text>
                            </View>
                            <Ionicons name="open-outline" size={18} color="#737373" style={{ marginLeft: 6 }} />
                          </Pressable>
                        ))}
                      </View>
                      {totalInvPages > 1 ? (
                        <View className="mt-4 flex-row items-center justify-between">
                          <Text className={`text-xs ${textMutedClass(resolved)}`}>
                            Page {invPage} of {totalInvPages}
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => setInvPage((p) => Math.max(1, p - 1))}
                              disabled={invPage <= 1}
                              className={`rounded-lg border px-3 py-2 ${
                                invPage <= 1
                                  ? resolved === "dark"
                                    ? "border-neutral-800 opacity-40"
                                    : "border-zinc-200 opacity-40"
                                  : resolved === "dark"
                                    ? "border-neutral-600 bg-neutral-900"
                                    : "border-zinc-300 bg-zinc-100"
                              }`}
                            >
                              <Text className={`text-xs font-medium ${textSectionBodyClass(resolved)}`}>Prev</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                              disabled={invPage >= totalInvPages}
                              className={`rounded-lg border px-3 py-2 ${
                                invPage >= totalInvPages
                                  ? resolved === "dark"
                                    ? "border-neutral-800 opacity-40"
                                    : "border-zinc-200 opacity-40"
                                  : resolved === "dark"
                                    ? "border-neutral-600 bg-neutral-900"
                                    : "border-zinc-300 bg-zinc-100"
                              }`}
                            >
                              <Text className={`text-xs font-medium ${textSectionBodyClass(resolved)}`}>Next</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>

                {isOwner ? (
                  <View className={`mt-8 pt-6 ${hairlineBorderTClass(resolved)}`}>
                    <Text className="text-sm font-semibold text-red-400/95">Delete customer</Text>
                    <Text className={`mt-1 text-xs leading-4 ${textMutedClass(resolved)}`}>
                      Permanently removes this customer. Invoices stay but will no longer be linked. Only when
                      outstanding balance is zero.
                    </Text>
                    {balanceBlocksDelete ? (
                      <Text className="mt-2 text-xs text-amber-500">
                        Clear outstanding balance (PKR {formatPkr(customer.outstanding_balance)}) before deleting.
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        setSaveError(null);
                        setDeleteOpen(true);
                      }}
                      disabled={balanceBlocksDelete}
                      className={`mt-3 rounded-xl border border-red-900/50 py-3 ${
                        balanceBlocksDelete ? "opacity-40" : "active:opacity-90"
                      }`}
                    >
                      <Text className="text-center text-sm font-semibold text-red-400">Delete customer</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Pressable onPress={onClose} className={`mt-6 ${modalSecondaryButtonClass(resolved)}`}>
                  <Text className={`text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>Close</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={deleteOpen}
        title="Delete customer?"
        message="This cannot be undone. Invoices remain in your account without this customer link."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteOpen(false);
        }}
        onConfirm={() => void onConfirmDelete()}
      />
    </>
  );
}
