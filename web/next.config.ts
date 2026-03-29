import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
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

export default nextConfig;
