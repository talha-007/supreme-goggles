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

/** Hostnames only (no protocol/port). Unblocks dev HMR when opening the app via your LAN IP. */
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.18.37",
  ...(process.env.NEXT_DEV_LAN_HOST?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
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
