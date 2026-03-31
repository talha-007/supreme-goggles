import { buildDailyDigestText, buildLowStockOnlyText } from "@/lib/whatsapp/digest";
import { getWhatsAppGraphConfig } from "@/lib/whatsapp/config";
import { normalizePhoneE164, sendWhatsAppTemplateAlert } from "@/lib/whatsapp/send";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Schedule via Vercel Cron, GitHub Actions, or any runner:
 *   GET /api/cron/whatsapp-digest
 *   Authorization: Bearer <CRON_SECRET>
 *   or (for hosts that cannot set headers): ?secret=<CRON_SECRET>
 *
 * Requires: WHATSAPP_* env, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const qs = url.searchParams.get("secret");
  const authorized =
    auth === `Bearer ${secret}` || (qs !== null && qs === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getWhatsAppGraphConfig()) {
    return NextResponse.json(
      { error: "WhatsApp env not configured (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)" },
      { status: 503 },
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY required for cron" },
      { status: 503 },
    );
  }

  const { data: businesses, error } = await admin
    .from("businesses")
    .select(
      "id, name, whatsapp_phone_e164, whatsapp_notify_daily, whatsapp_notify_low_stock",
    )
    .not("whatsapp_phone_e164", "is", null)
    .or("whatsapp_notify_daily.eq.true,whatsapp_notify_low_stock.eq.true");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { businessId: string; ok: boolean; detail?: string }[] = [];

  for (const b of businesses ?? []) {
    const phone = normalizePhoneE164(b.whatsapp_phone_e164 as string);
    if (!phone) {
      results.push({ businessId: b.id as string, ok: false, detail: "invalid phone" });
      continue;
    }

    const daily = Boolean(b.whatsapp_notify_daily);
    const low = Boolean(b.whatsapp_notify_low_stock);

    try {
      if (daily) {
        const digest = await buildDailyDigestText(admin, b.id as string, low);
        if (digest) {
          const r = await sendWhatsAppTemplateAlert(phone, digest.title, digest.body);
          results.push({
            businessId: b.id as string,
            ok: r.ok,
            detail: r.ok ? undefined : r.error,
          });
        }
      } else if (low) {
        const only = await buildLowStockOnlyText(admin, b.id as string);
        const r = await sendWhatsAppTemplateAlert(phone, only.title, only.body);
        results.push({
          businessId: b.id as string,
          ok: r.ok,
          detail: r.ok ? undefined : r.error,
        });
      }
    } catch (e) {
      results.push({
        businessId: b.id as string,
        ok: false,
        detail: e instanceof Error ? e.message : "error",
      });
    }
  }

  return NextResponse.json({ sent: results.filter((x) => x.ok).length, results });
}
