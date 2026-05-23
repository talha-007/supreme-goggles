import { Linking } from "react-native";

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = digitsOnly(raw.trim());
  if (!d) return null;

  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("92") && d.length >= 12) return d;
  if (d.length === 11 && d.startsWith("0")) return `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("3")) return `92${d}`;
  if (d.length >= 8) return d;
  return null;
}

export async function openWhatsAppMessage(phone: string | null | undefined, text: string): Promise<{ error?: string }> {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    return { error: "No valid WhatsApp phone number found." };
  }
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text.trim())}`;
  try {
    await Linking.openURL(url);
    return {};
  } catch {
    return { error: "Could not open WhatsApp on this device." };
  }
}

function moneyPkr(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildCreditInvoiceAlert(input: {
  customerName?: string | null;
  invoiceNumber: string;
  totalAmount: number;
  dueAmount: number;
}): string {
  const name = input.customerName?.trim() || "Customer";
  return [
    `Salam ${name},`,
    "",
    `Your credit bill ${input.invoiceNumber} has been recorded.`,
    `Total: ${moneyPkr(input.totalAmount)}`,
    `Due now: ${moneyPkr(input.dueAmount)}`,
    "",
    "Please pay on time. Thank you.",
  ].join("\n");
}

export function buildSupplierPurchaseAlert(input: {
  supplierName?: string | null;
  poNumber: string;
  totalAmount: number;
}): string {
  const name = input.supplierName?.trim() || "Supplier";
  return [
    `Salam ${name},`,
    "",
    `Purchase order ${input.poNumber} has been confirmed.`,
    `Order total: ${moneyPkr(input.totalAmount)}`,
    "",
    "Please confirm availability and delivery timing. Thank you.",
  ].join("\n");
}
