import Link from "next/link";

type Props = {
  canManageProducts: boolean;
  canManageInvoices: boolean;
};

const shortcutLink =
  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

export function RetailShortcuts({ canManageProducts, canManageInvoices }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Quick actions
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canManageInvoices ? (
          <Link href="/dashboard/invoices/new" className={shortcutLink}>
            New invoice
          </Link>
        ) : null}
        {canManageProducts ? (
          <>
            <Link href="/dashboard/purchase-orders/new" className={shortcutLink}>
              New purchase order
            </Link>
            <Link href="/dashboard/products/new" className={shortcutLink}>
              Add product
            </Link>
            <Link href="/dashboard/suppliers/new" className={shortcutLink}>
              Add supplier
            </Link>
          </>
        ) : null}
        <Link href="/dashboard/products?stock=low" className={shortcutLink}>
          Low stock list
        </Link>
        <Link href="/dashboard/purchase-orders" className={shortcutLink}>
          All purchase orders
        </Link>
      </div>
    </div>
  );
}
