import type { Metadata } from "next";

/**
 * Canonical site origin for metadata, sitemap, and Open Graph.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://app.example.com).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    const v = process.env.VERCEL_URL.trim();
    return v.startsWith("http") ? v.replace(/\/$/, "") : `https://${v.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

const defaultDescription =
  "Stock, billing, customers, and purchase orders for retailers and wholesalers — built for shop counters.";

export function getDefaultDescription(): string {
  return defaultDescription;
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const base = new URL(siteUrl);

  const verification: Metadata["verification"] = process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined;

  return {
    metadataBase: base,
    title: {
      default: "Retail SaaS",
      template: "%s | Retail SaaS",
    },
    description: defaultDescription,
    applicationName: "Retail SaaS",
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: base,
      siteName: "Retail SaaS",
      title: "Retail SaaS",
      description: defaultDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: "Retail SaaS",
      description: defaultDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(verification ? { verification } : {}),
  };
}
