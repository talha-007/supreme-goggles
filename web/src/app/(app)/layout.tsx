import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) {
    redirect("/onboarding");
  }

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", membership.business_id)
    .single();

  const businessName = businessRow?.name ?? "Business";

  return <AppShell businessName={businessName}>{children}</AppShell>;
}
