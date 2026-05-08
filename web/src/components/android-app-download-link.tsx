import type { ReactNode } from "react";

import { getAndroidAppUrl } from "@/lib/brand";

type Props = {
  className?: string;
  children: ReactNode;
};

/**
 * Renders a public download link when an Android URL can be derived
 * (explicit `NEXT_PUBLIC_ANDROID_APP_URL`, or Supabase Storage public object URL).
 */
export function AndroidAppDownloadLink({ className, children }: Props) {
  const url = getAndroidAppUrl();
  if (!url) return null;

  const isDirectApk =
    /\.apk($|\?)/i.test(url) || url.includes("/app-downloads/");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...(isDirectApk ? { download: "taplite.apk" as const } : {})}
    >
      {children}
    </a>
  );
}
