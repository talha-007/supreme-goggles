import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function supabaseImageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const host = supabaseImageHostname();

const imageRemotePatterns: Array<{
  protocol: "https";
  hostname: string;
  pathname: string;
}> = [
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
  ...(host
    ? [
        {
          protocol: "https" as const,
          hostname: host,
          pathname: "/storage/v1/object/public/**",
        },
      ]
    : []),
];

const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.18.37",
  "tnrgq2zp-3000.inc1.devtunnels.ms",
];

const nextConfig: NextConfig = {
  allowedDevOrigins,

  // ✅ THIS IS THE IMPORTANT FIX
  experimental: {
    serverActions: {
      allowedOrigins: ["*"], // 🔥 quick fix
      /** Default 1MB rejects product photo uploads before the action runs; app allows images up to 2MB + form fields. */
      bodySizeLimit: "3mb",
    },
  },

  /**
   * Unsplash (and Supabase) for any remote `next/image` src.
   * The marketing landing also uses static files in `public/landing/*.jpg`.
   */
  images: {
    remotePatterns: imageRemotePatterns,
  },
};

// next-intl preserves the full `nextConfig` object, including `images`.
export default withNextIntl(nextConfig);