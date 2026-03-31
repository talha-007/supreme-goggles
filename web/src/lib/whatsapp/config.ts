/**
 * Meta WhatsApp Cloud API — set in env (never commit tokens).
 *
 * Templates must use named body variables: lowercase, underscores, digits only, e.g.
 *   {{alert_title}}  {{alert_message}}  or a single {{alert_message}}
 * Match names to WHATSAPP_TEMPLATE_PARAM_* (defaults below).
 *
 * Meta may reject very short bodies with multiple variables (“too many variables for
 * its length”). Fix by adding more static text in the template, or set
 * WHATSAPP_TEMPLATE_SINGLE_BODY=true and use one variable only.
 */
export function getWhatsAppGraphConfig(): {
  phoneNumberId: string;
  accessToken: string;
  graphVersion: string;
  templateName: string;
  templateLang: string;
  /** Must match the variable names in your Meta template body exactly. */
  paramTitle: string;
  paramBody: string;
  /** One body param only: title + message concatenated (paramTitle unused in API). */
  singleBodyParam: boolean;
} | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!phoneNumberId || !accessToken) {
    return null;
  }
  const singleRaw = process.env.WHATSAPP_TEMPLATE_SINGLE_BODY?.trim().toLowerCase();
  const singleBodyParam = singleRaw === "1" || singleRaw === "true" || singleRaw === "yes";
  return {
    phoneNumberId,
    accessToken,
    graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v22.0",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || "shop_alert",
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en_US",
    paramTitle: process.env.WHATSAPP_TEMPLATE_PARAM_TITLE?.trim() || "alert_title",
    paramBody: process.env.WHATSAPP_TEMPLATE_PARAM_BODY?.trim() || "alert_message",
    singleBodyParam,
  };
}
