import { Linking } from "react-native";

/** Shown in the app (local Pakistan format). */
export const SUPPORT_PHONE_DISPLAY = "0300 8601824";

/** wa.me expects country code + number without + or leading 0 (PK +92, mobile 300…). */
const SUPPORT_WHATSAPP_WA_ME = "923008601824";

export async function openSupportWhatsApp(prefillMessage?: string): Promise<void> {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_WA_ME}`;
  const url =
    prefillMessage != null && prefillMessage.trim().length > 0
      ? `${base}?text=${encodeURIComponent(prefillMessage.trim())}`
      : base;
  await Linking.openURL(url);
}
