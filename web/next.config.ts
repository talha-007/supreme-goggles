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
    },
  },

  ...(host
    ? {
        images: {
          remotePatterns: [
            {
              protocol: "https" as const,
              hostname: host,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        },
      }
    : {}),
};

export default withNextIntl(nextConfig);