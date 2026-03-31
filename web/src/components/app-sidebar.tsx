import Link from "next/link";

/** Translation keys under `nav` in messages. */
export const appNav = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/dashboard/products", key: "products" },
  { href: "/dashboard/products?stock=low", key: "lowStock" },
  { href: "/dashboard/customers", key: "customers" },
  { href: "/dashboard/invoices", key: "invoices" },
  { href: "/dashboard/purchase-orders", key: "purchaseOrders" },
  { href: "/dashboard/suppliers", key: "suppliers" },
  { href: "/dashboard/settings", key: "settings" },
] as const;

export type NavLinkItem = { href: string; label: string };

export function SidebarBrand({ title }: { title: string }) {
  return (
    <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
    </div>
  );
}

type SidebarNavProps = {
  links: readonly NavLinkItem[];
  onLinkClick?: () => void;
};

export function SidebarNav({ links, onLinkClick }: SidebarNavProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onLinkClick}
          className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Visible from `lg` and up; hidden on small screens (use mobile drawer in `AppShell`). */
export function AppSidebarDesktop({ links, brandTitle }: { links: readonly NavLinkItem[]; brandTitle: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
      <SidebarBrand title={brandTitle} />
      <SidebarNav links={links} />
    </aside>
  );
}
