import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/product";
import Image from "next/image";
import Link from "next/link";

function sanitizeSearch(q: string): string {
  return q.trim().slice(0, 80).replace(/[%_]/g, "");
}

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireBusinessContext();
  const canEdit = canManageProducts(ctx.role);
  const params = await searchParams;
  const rawQ = params.q ?? "";
  const q = sanitizeSearch(rawQ);

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("business_id", ctx.businessId)
    .order("name", { ascending: true });

  if (q.length > 0) {
    const pattern = `%${q}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern}`);
  }

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Products
        </h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error.message}</p>
      </div>
    );
  }

  const products = (rows ?? []) as ProductRow[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Products
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage inventory for your business.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Add product
          </Link>
        ) : null}
      </div>

      <form
        className="mt-6 flex max-w-md flex-col gap-2 sm:flex-row sm:items-center"
        action="/dashboard/products"
        method="get"
      >
        <input
          name="q"
          type="search"
          defaultValue={rawQ}
          placeholder="Search name, SKU, barcode…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Search
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="w-14 px-4 py-3">Photo</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3 text-right">Sale</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 8 : 7}
                  className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {q ? "No products match your search." : "No products yet. Add your first product."}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const low = p.current_stock <= p.reorder_level && p.reorder_level > 0;
                return (
                  <tr key={p.id} className="text-zinc-800 dark:text-zinc-200">
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
                          <Image
                            src={p.image_url}
                            alt=""
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.sku ?? "—"}</td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pkr.format(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={low ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                        {p.current_stock}
                      </span>
                      {low ? (
                        <span className="ml-1 text-xs text-amber-600 dark:text-amber-500">Low</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/products/${p.id}/edit`}
                          className="text-sm font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                        >
                          Edit
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
