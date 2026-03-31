import { getWhatsAppGraphConfig } from "@/lib/whatsapp/config";

export type SendTemplateResult = { ok: true } | { ok: false; error: string };

const MAX_BODY = 900;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Normalize to digits only (WhatsApp `to` field). */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

function combinedAlertText(title: string, body: string): string {
  const t = title.trim();
  const b = body.trim();
  if (!t) return b;
  if (!b) return t;
  return `${t}\n\n${b}`;
}

/**
 * Send a pre-approved template with named body parameters (see WHATSAPP_TEMPLATE_SINGLE_BODY).
 * Meta requires {{snake_case}} names in the template; API sends `parameter_name` to match.
 */
export async function sendWhatsAppTemplateAlert(
  toDigits: string,
  title: string,
  body: string,
): Promise<SendTemplateResult> {
  const cfg = getWhatsAppGraphConfig();
  if (!cfg) {
    return { ok: false, error: "WhatsApp is not configured (missing env)." };
  }

  const bodyParameters = cfg.singleBodyParam
    ? [
        {
          type: "text" as const,
          parameter_name: cfg.paramBody,
          text: truncate(combinedAlertText(title, body), MAX_BODY),
        },
      ]
    : [
        {
          type: "text" as const,
          parameter_name: cfg.paramTitle,
          text: truncate(title, 60),
        },
        {
          type: "text" as const,
          parameter_name: cfg.paramBody,
          text: truncate(body, MAX_BODY),
        },
      ];

  const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toDigits,
      type: "template",
      template: {
        name: cfg.templateName,
        language: { code: cfg.templateLang },
        components: [
          {
            type: "body",
            parameters: bodyParameters,
          },
        ],
      },
    }),
  });

  const json = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    return {
      ok: false,
      error: json.error?.message ?? `HTTP ${res.status}`,
    };
  }
  return { ok: true };
}

/** Fire-and-forget; logs errors in development. */
export function queueWhatsAppAlert(toDigits: string | null, title: string, body: string): void {
  if (!toDigits) return;
  void sendWhatsAppTemplateAlert(toDigits, title, body).then((r) => {
    if (!r.ok && process.env.NODE_ENV === "development") {
      console.warn("[WhatsApp]", r.error);
    }
  });
}
