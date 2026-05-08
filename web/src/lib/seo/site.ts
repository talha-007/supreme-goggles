import { BRAND_DOMAIN, BRAND_FAVICON, BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import type { Metadata } from "next";

/**
 * Canonical site origin for metadata, sitemap, and Open Graph.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://taplite.store or your app host).
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

const defaultDescription = BRAND_TAGLINE;

export function getDefaultDescription(): string {
  return defaultDescription;
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const base = new URL(siteUrl);
  /** OG previews are usually on light surfaces; use the dark-theme (black) mark. */
  const ogImage = new URL(BRAND_LOGO.dark, base).toString();

  const verification: Metadata["verification"] = process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined;

  return {
    metadataBase: base,
    title: {
      default: `${BRAND_NAME} | ${BRAND_DOMAIN}`,
      template: `%s | ${BRAND_NAME}`,
    },
    description: defaultDescription,
    applicationName: BRAND_NAME,
    icons: {
      icon: [{ url: BRAND_FAVICON, type: "image/png" }],
      shortcut: BRAND_FAVICON,
      apple: BRAND_FAVICON,
    },
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
      siteName: `${BRAND_NAME} (${BRAND_DOMAIN})`,
      title: `${BRAND_NAME} | ${BRAND_DOMAIN}`,
      description: defaultDescription,
      images: [{ url: ogImage, alt: `${BRAND_NAME} logo` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND_NAME} | ${BRAND_DOMAIN}`,
      description: defaultDescription,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(verification ? { verification } : {}),
  };
}
