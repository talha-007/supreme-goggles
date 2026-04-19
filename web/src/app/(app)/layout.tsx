import { appNav } from "@/components/app-sidebar";
import { AppShell } from "@/components/app-shell";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { hasSubscriptionAccess, isSuperAdminByEnv } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/** Avoid stale membership checks that can ping-pong /dashboard ↔ /onboarding. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const superAdminBypass = isSuperAdminByEnv(ctx.userId, ctx.userEmail);
  const hasAccess = superAdminBypass
    ? true
    : await hasSubscriptionAccess(supabase, ctx.businessId);
  if (!hasAccess) {
    redirect("/subscription-expired");
  }

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("name, logo_url, type")
    .eq("id", ctx.businessId)
    .maybeSingle();

  const businessName = businessRow?.name ?? "Business";
  const businessLogoUrl = (businessRow?.logo_url as string | null) ?? null;
  const businessType = (businessRow?.type as BusinessType | null) ?? "shop";

  const { data: rawBusinessSettings } = await supabase
    .from("business_settings")
    .select(
      "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
    )
    .eq("business_id", ctx.businessId)
    .maybeSingle();
  const capabilities = resolveBusinessCapabilities(businessType, rawBusinessSettings);

  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const navLinks = appNav.map((item) => ({
    href: item.href,
    label: tNav(item.key),
    key: item.key,
  }));

  return (
    <AppShell
      businessName={businessName}
      businessLogoUrl={businessLogoUrl}
      capabilities={capabilities}
      brandTitle={tCommon("brand")}
      navLinks={navLinks}
    >
      {children}
    </AppShell>
  );
}
