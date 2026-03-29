import { PoEditor } from "@/components/purchase-orders/po-editor";
import { listSuppliers } from "@/lib/purchase-orders/actions";
import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewPurchaseOrderPage() {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit, purchase_price")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name");

  const { suppliers, error } = await listSuppliers();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/dashboard/purchase-orders"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Purchase orders
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New purchase order
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create a draft, confirm when sent to the supplier, then receive stock when goods arrive.
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
          Could not load suppliers: {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <PoEditor
          products={(products ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            unit: p.unit,
            purchase_price: Number(p.purchase_price),
          }))}
          suppliers={suppliers ?? []}
        />
      </div>
    </div>
  );
}
