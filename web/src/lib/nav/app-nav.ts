/** Translation keys under `nav` in messages. */
export const appNav = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/dashboard/analytics", key: "analytics" },
  { href: "/dashboard/menu", key: "menu" },
  { href: "/dashboard/restaurant/tables", key: "tables" },
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
