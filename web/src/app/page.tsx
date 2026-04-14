import { requireBusinessContext } from "@/lib/auth/business-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireBusinessContext();
  redirect("/dashboard");
}
