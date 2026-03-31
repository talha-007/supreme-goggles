import { createClient } from "@/lib/supabase/server";
import { normalizePhoneE164, queueWhatsAppAlert } from "@/lib/whatsapp/send";

type BizFlags = {
  whatsapp_phone_e164: string | null;
  whatsapp_notify_po: boolean;
  whatsapp_notify_receive: boolean;
};

export async function loadBusinessWhatsApp(
  businessId: string,
): Promise<BizFlags | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("whatsapp_phone_e164, whatsapp_notify_po, whatsapp_notify_receive")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    whatsapp_phone_e164: data.whatsapp_phone_e164 as string | null,
    whatsapp_notify_po: Boolean(data.whatsapp_notify_po),
    whatsapp_notify_receive: Boolean(data.whatsapp_notify_receive),
  };
}

export function notifyPoConfirmed(businessId: string, poNumber: string): void {
  void (async () => {
    const b = await loadBusinessWhatsApp(businessId);
    if (!b?.whatsapp_notify_po) return;
    const to = normalizePhoneE164(b.whatsapp_phone_e164);
    if (!to) return;
    queueWhatsAppAlert(
      to,
      `PO ${poNumber} confirmed`,
      `Purchase order ${poNumber} was marked as ordered (sent to supplier).`,
    );
  })();
}

export function notifyStockReceived(
  businessId: string,
  poNumber: string,
  newStatus: string,
  linesSummary: string,
): void {
  void (async () => {
    const b = await loadBusinessWhatsApp(businessId);
    if (!b?.whatsapp_notify_receive) return;
    const to = normalizePhoneE164(b.whatsapp_phone_e164);
    if (!to) return;
    queueWhatsAppAlert(
      to,
      `Stock received · ${poNumber}`,
      `PO ${poNumber} is now ${newStatus}.\n${linesSummary}`,
    );
  })();
}
