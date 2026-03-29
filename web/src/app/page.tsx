import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: members } = await supabase
    .from("business_members")
    .select("business_id")
    .limit(1);

  if (!members?.length) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
