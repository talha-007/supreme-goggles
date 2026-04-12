import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membershipRows } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .order("id", { ascending: true })
    .limit(1);

  const membership = membershipRows?.[0];

  if (!membership?.business_id) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
