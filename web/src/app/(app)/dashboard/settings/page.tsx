import { InvoiceDefaultsForm } from "@/components/settings/invoice-defaults-form";
import {
  canManageBusinessSettings,
  requireBusinessContext,
} from "@/lib/auth/business-context";
import { getBusinessInvoiceDefaults } from "@/lib/settings/actions";

export default async function SettingsPage() {
  const ctx = await requireBusinessContext();
  const canEditSettings = canManageBusinessSettings(ctx.role);
  const defaults = await getBusinessInvoiceDefaults();

  const initial = defaults ?? {
    default_tax_rate: 0,
    default_invoice_discount_amount: 0,
    default_line_discount_pct: 0,
    tax_label: null as string | null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Defaults for invoices and receipts. More options (business profile, team) can be added here
        later.
      </p>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Invoice & tax defaults</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          New invoices start with these values. Staff can still adjust tax and discounts on each sale.
        </p>
        <div className="mt-6">
          <InvoiceDefaultsForm initial={initial} canEdit={canEditSettings} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-600">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Coming next</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
          <li>Shop name, phone, and address on receipts (beyond PDF)</li>
          <li>Team members and roles</li>
          <li>Subscription / billing</li>
        </ul>
      </section>
    </div>
  );
}
