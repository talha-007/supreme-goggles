import Link from "next/link";

/** Translation keys under `nav` in messages. */
export const appNav = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/dashboard/menu", key: "menu" },
  { href: "/dashboard/restaurant/tables", key: "tables" },
  { href: "/dashboard/restaurant/waiters", key: "waiters" },
  { href: "/dashboard/restaurant/waiter-board", key: "waiterBoard" },
  { href: "/dashboard/restaurant/kitchen", key: "kitchen" },
  { href: "/dashboard/restaurant/counter", key: "counter" },
  { href: "/dashboard/restaurant/staff", key: "staff" },
  { href: "/dashboard/products", key: "products" },
  { href: "/dashboard/products?stock=low", key: "lowStock" },
  { href: "/dashboard/customers", key: "customers" },
  { href: "/dashboard/invoices", key: "invoices" },
  { href: "/dashboard/purchase-orders", key: "purchaseOrders" },
  { href: "/dashboard/suppliers", key: "suppliers" },
  { href: "/dashboard/expenses", key: "expenses" },
  { href: "/dashboard/settings", key: "settings" },
] as const;

export type NavLinkKey = (typeof appNav)[number]["key"];
export type NavLinkItem = { href: string; label: string; key: NavLinkKey };

function NavIcon({ navKey }: { navKey: NavLinkKey }) {
  const cls = "h-4 w-4";
  switch (navKey) {
    case "dashboard":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 2a1 1 0 0 1 .707.293l6 6A1 1 0 0 1 17 9v8a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9a1 1 0 0 1 .293-.707l6-6A1 1 0 0 1 10 2Z" />
        </svg>
      );
    case "products":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9A2.5 2.5 0 0 1 14.5 17h-9A2.5 2.5 0 0 1 3 14.5v-9Zm3 1a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H6Zm0 3a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5H6Zm0 3a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5H6Z" />
        </svg>
      );
    case "lowStock":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 2 2 17h16L10 2Zm0 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
        </svg>
      );
    case "menu":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4 3.75A1.75 1.75 0 0 1 5.75 2h8.5A1.75 1.75 0 0 1 16 3.75v12.5A1.75 1.75 0 0 1 14.25 18h-8.5A1.75 1.75 0 0 1 4 16.25V3.75Zm3 .75a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H7Zm0 3a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H7Zm0 3a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H7Z" />
        </svg>
      );
    case "tables":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H3V6Zm1 4h5v6H7v-4H6v4H4v-6Zm7 0h5v6h-2v-4h-1v4h-2v-6Z" />
        </svg>
      );
    case "waiters":
    case "waiterBoard":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5v-11Zm3 .5a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H7Zm0 3a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5H7Zm0 3a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5H7Z" />
        </svg>
      );
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-6 14a6 6 0 0 1 12 0H4Z" />
        </svg>
      );
    case "kitchen":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5 3a1 1 0 0 1 1 1v5.5a2.5 2.5 0 0 0 5 0V4a1 1 0 1 1 2 0v5.5a4.5 4.5 0 0 1-9 0V4a1 1 0 0 1 1-1Zm6 12a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2h6Z" />
        </svg>
      );
    case "counter":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9ZM6 7a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H6Zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H6Z" />
        </svg>
      );
    case "staff":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 16a4.5 4.5 0 0 1 9 0h-9Zm8.5 0a3.5 3.5 0 0 1 7 0h-7Z" />
        </svg>
      );
    case "customers":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7a7 7 0 1 1 14 0H3Z" />
        </svg>
      );
    case "invoices":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5 2.75A1.75 1.75 0 0 0 3.25 4.5v11A1.75 1.75 0 0 0 5 17.25h10A1.75 1.75 0 0 0 16.75 15.5v-11A1.75 1.75 0 0 0 15 2.75H5Zm2.25 4a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Z" />
        </svg>
      );
    case "purchaseOrders":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1H3V5Zm0 3h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm3 2a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H6Z" />
        </svg>
      );
    case "suppliers":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11Zm3.5 2a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 3a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 3a.75.75 0 0 0 0 1.5H11a.75.75 0 0 0 0-1.5H6.5Z" />
        </svg>
      );
    case "expenses":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h9A1.5 1.5 0 0 1 16 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 16.5v-13Zm3.25 3a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5ZM7 10a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 7 10Zm0 2.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M8.87 2.39a1.5 1.5 0 0 1 2.26 0l.64.73a1.5 1.5 0 0 0 1.47.46l.95-.2a1.5 1.5 0 0 1 1.6 1.6l-.2.95a1.5 1.5 0 0 0 .46 1.47l.73.64a1.5 1.5 0 0 1 0 2.26l-.73.64a1.5 1.5 0 0 0-.46 1.47l.2.95a1.5 1.5 0 0 1-1.6 1.6l-.95-.2a1.5 1.5 0 0 0-1.47.46l-.64.73a1.5 1.5 0 0 1-2.26 0l-.64-.73a1.5 1.5 0 0 0-1.47-.46l-.95.2a1.5 1.5 0 0 1-1.6-1.6l.2-.95a1.5 1.5 0 0 0-.46-1.47l-.73-.64a1.5 1.5 0 0 1 0-2.26l.73-.64a1.5 1.5 0 0 0 .46-1.47l-.2-.95a1.5 1.5 0 0 1 1.6-1.6l.95.2a1.5 1.5 0 0 0 1.47-.46l.64-.73ZM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
      );
    default:
      return null;
  }
}

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
  collapsed?: boolean;
};

export function SidebarNav({ links, onLinkClick, collapsed = false }: SidebarNavProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onLinkClick}
          title={collapsed ? item.label : undefined}
          className={
            collapsed
              ? "flex items-center justify-center rounded-lg px-2 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }
        >
          <NavIcon navKey={item.key} />
          {!collapsed ? item.label : null}
        </Link>
      ))}
    </nav>
  );
}

/** Visible from `lg` and up; hidden on small screens (use mobile drawer in `AppShell`). */
export function AppSidebarDesktop({
  links,
  brandTitle,
  collapsed,
  onToggleCollapsed,
}: {
  links: readonly NavLinkItem[];
  brandTitle: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:overflow-y-auto lg:self-start ${
        collapsed ? "w-20" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {collapsed ? brandTitle.slice(0, 2).toUpperCase() : brandTitle}
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            {collapsed ? (
              <path d="M7.22 4.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 0 1 0-1.06Z" />
            ) : (
              <path d="M12.78 15.78a.75.75 0 0 1-1.06 0L6.47 10.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 1 1 1.06 1.06L8.06 10l4.72 4.72a.75.75 0 0 1 0 1.06Z" />
            )}
          </svg>
        </button>
      </div>
      <SidebarNav links={links} collapsed={collapsed} />
    </aside>
  );
}
