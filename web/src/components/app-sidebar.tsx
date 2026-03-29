import Link from "next/link";

export const appNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function SidebarBrand() {
  return (
    <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Retail SaaS</span>
    </div>
  );
}

type SidebarNavProps = {
  onLinkClick?: () => void;
};

export function SidebarNav({ onLinkClick }: SidebarNavProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {appNav.map((item) => (
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
export function AppSidebarDesktop() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
