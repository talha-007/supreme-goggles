import { AppSidebar } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
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

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {businessName}
          </span>
          <SignOutButton />
        </header>
        <main className="flex-1 bg-zinc-50 p-6 dark:bg-zinc-900">{children}</main>
      </div>
    </div>
  );
}
