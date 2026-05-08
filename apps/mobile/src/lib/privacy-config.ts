import Constants from "expo-constants";

/** `EXPO_PUBLIC_PRIVACY_POLICY_URL` at build time (e.g. https://yoursite.com/privacy). */
export function getPrivacyPolicyUrl(): string {
  const extra = Constants.expoConfig?.extra as { privacyPolicyUrl?: string } | undefined;
  return String(extra?.privacyPolicyUrl ?? "").trim();
}

/** Short summary shown on Settings; full detail lives on the Privacy policy screen. */
export const IN_APP_DATA_PROCESSING_SUMMARY = `This app connects to your shop’s account to:
• sign you in and keep your session secure;
• load and update bills, products, customers, and settings for your business;
• optionally use the camera/photo library if you add product or logo images;
• use optional WhatsApp to contact support.

Data is stored with your service provider; ask your shop admin for full details.`;

export type PrivacySection = { title: string; body: string };

/** Effective date shown at top of in-app policy (update when you materially change practices). */
export const PRIVACY_POLICY_EFFECTIVE_DATE = "January 2026";

/**
 * Standard POS-style in-app privacy disclosure (English).
 * Replace hosted URL / legal review with counsel before production if needed.
 */
export const PRIVACY_POLICY_SECTIONS: PrivacySection[] = [
  {
    title: "Introduction",
    body: `This Privacy Policy describes how Taplite (“we”, “us”, “our”) handles information when you use our mobile point-of-sale application (“App”) together with the connected services your shop uses.\n\nBy using the App, you acknowledge this Policy. If you do not agree, please discontinue use and contact your shop administrator.`,
  },
  {
    title: "Who this applies to",
    body: `The App is intended for businesses and authorized staff. Your employer or shop administrator controls workspace access, roles, and many settings. Questions about what data your organization stores or processes should be directed to them where appropriate.`,
  },
  {
    title: "Information we collect",
    body: `Account & authentication: identifiers such as email address and credentials used to sign in (processed through our authentication provider).\n\nBusiness / operational data: information your shop enters or generates in the normal course of POS use—such as sales and invoices, products and inventory, customers, suppliers, payments-related metadata you record, business profile fields, and timestamps.\n\nOptional device features: with your permission, the camera or photo library may be used to capture images (for example product photos or a business logo).\n\nSupport communications: information you provide when contacting support (including messages sent through linked channels such as WhatsApp when you choose to use them).\n\nTechnical & security data: device type, operating system version, app version, diagnostic logs, IP address, and similar data needed to operate, secure, troubleshoot, and prevent abuse of the service.`,
  },
  {
    title: "How we use information",
    body: `We use the information above to:\n• provide, operate, and improve the App and backend services;\n• authenticate users and maintain sessions;\n• sync and display data your shop is authorized to access;\n• send service-related communications where applicable (for example via your auth/email provider);\n• provide customer support;\n• detect, investigate, and help prevent fraud, abuse, or security incidents;\n• comply with applicable law and enforce our terms.\n\nWe do not sell your personal information.`,
  },
  {
    title: "How we share information",
    body: `We may share information with:\n• infrastructure and service providers that host or process data on our behalf (for example cloud database, authentication, analytics, or messaging vendors);\n• payment networks or processors only where your shop integrates them and in accordance with that integration’s terms;\n• authorities when required by law or to protect rights, safety, and integrity.\n\nProcessors are expected to handle data under contractual safeguards appropriate to their role.`,
  },
  {
    title: "Retention",
    body: `We retain information as long as needed to provide the service and for legitimate business and legal purposes (for example security, dispute resolution, and compliance). Actual retention may depend on your shop’s configuration, administrator actions, backups, and applicable law.`,
  },
  {
    title: "Security",
    body: `We implement reasonable technical and organizational measures designed to protect information. No method of transmission or storage is completely secure; use strong passwords and protect access to your devices and accounts.`,
  },
  {
    title: "Your choices & rights",
    body: `Depending on your region, you may have rights to access, correct, delete, or restrict certain processing of personal information, or to object or lodge a complaint with a regulator.\n\nBecause much of the data relates to a business workspace, many requests must be coordinated through your shop administrator. You may also contact us using the support options described in the App.`,
  },
  {
    title: "International transfers",
    body: `Your information may be processed in countries where we or our subprocessors operate. Where required, we rely on appropriate safeguards (such as contractual clauses) consistent with applicable law.`,
  },
  {
    title: "Children",
    body: `The App is not directed at children. Business accounts should not be operated by children without appropriate guardian involvement as required by law.`,
  },
  {
    title: "Changes to this Policy",
    body: `We may update this Policy from time to time. Material changes may be communicated through the App or other reasonable means. The effective date at the top reflects the latest general revision.`,
  },
];
