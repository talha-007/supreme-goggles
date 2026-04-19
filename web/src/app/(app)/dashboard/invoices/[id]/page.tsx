import { InvoiceAutoPrint } from "@/components/invoices/invoice-auto-print";
import { InvoiceFinalizeButtons } from "@/components/invoices/invoice-detail-actions";
import { InvoicePaymentForm } from "@/components/invoices/invoice-payment-form";
import { RestaurantOrderStatusButtons } from "@/components/invoices/restaurant-order-status-buttons";
import { InvoiceReverseButton } from "@/components/invoices/invoice-reverse-button";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceItemRow, InvoiceRow } from "@/types/invoice";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

function paymentMethodLabel(
  tPay: Awaited<ReturnType<typeof getTranslations>>,
  method: string,
) {
  return tPay(`methods.${method}` as Parameters<typeof tPay>[0]);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusinessContext();
  const canEdit = canManageInvoices(ctx.role);
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const t = await getTranslations("invoiceDetail");
  const tStatus = await getTranslations("invoiceStatus");
  const tPay = await getTranslations("invoicePayment");
  const [{ data: businessRow }, { data: settingsRow }] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", ctx.businessId).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  const isRestaurant = caps.type === "restaurant";

  const pkr = new Intl.NumberFormat(intlTag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers (
        name,
        phone,
        address
      ),
      restaurant_tables ( name ),
      restaurant_staff!invoices_waiter_id_fkey ( name )
    `,
    )
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }
  if (!invoice) {
    notFound();
  }

  const inv = invoice as InvoiceRow & {
    customers: { name: string; phone: string | null; address: string | null } | null;
    restaurant_tables?: { name: string } | { name: string }[] | null;
    restaurant_staff?: { name: string } | { name: string }[] | null;
  };
  const tableName = Array.isArray(inv.restaurant_tables)
    ? (inv.restaurant_tables[0]?.name ?? null)
    : (inv.restaurant_tables?.name ?? null);
  const waiterName = Array.isArray(inv.restaurant_staff)
    ? (inv.restaurant_staff[0]?.name ?? null)
    : (inv.restaurant_staff?.name ?? null);

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: false });

  const total = Number(inv.total_amount);
  const paid = Number(inv.paid_amount);
  const balance = Math.round((total - paid) * 100) / 100;

  const statusKey = inv.status as
    | "draft"
    | "unpaid"
    | "partial"
    | "paid"
    | "cancelled";
  const statusLabel = tStatus(statusKey);

  const showReverse =
    canEdit &&
    inv.status !== "draft" &&
    inv.status !== "cancelled";

  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={null}>
        <InvoiceAutoPrint invoiceId={id} />
      </Suspense>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {t("backLink")}
          </Link>
          <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {inv.invoice_number}
          </h1>
          <p className="mt-1 text-sm capitalize text-zinc-600 dark:text-zinc-400">
            {t("statusLabel")}: {statusLabel}
          </p>
        </div>
        <div className="flex w-full max-w-full flex-wrap gap-2 sm:justify-end">
          <a
            href={`/api/invoices/${id}/pdf?copy=customer`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("viewPrintPdf")}
          </a>
          {showReverse ? <InvoiceReverseButton invoiceId={id} compact /> : null}
          {canEdit && inv.status !== "draft" ? (
            <Link
              href="/dashboard/invoices/new"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {t("newInvoice")}
            </Link>
          ) : null}
          {canEdit && inv.status === "draft" ? (
            <Link
              href={`/dashboard/invoices/${id}/edit`}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {t("editDraft")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {t("customerSection")}
            </h2>
            {inv.customers ? (
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                <p className="font-medium">{inv.customers.name}</p>
                {inv.customers.phone ? <p>{inv.customers.phone}</p> : null}
                {inv.customers.address ? <p className="whitespace-pre-wrap">{inv.customers.address}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("walkIn")}</p>
            )}
            {isRestaurant ? (
              <div className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Table: </span>
                  {tableName ?? "—"}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Waiter: </span>
                  {waiterName ?? "—"}
                </p>
                <p className="capitalize">
                  <span className="text-zinc-500 dark:text-zinc-400">Service: </span>
                  {String(inv.service_mode ?? "counter").replace("_", " ")}
                </p>
                <p className="capitalize">
                  <span className="text-zinc-500 dark:text-zinc-400">Order: </span>
                  {String(inv.restaurant_order_status ?? "new").replace("_", " ")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 text-left">{t("colItem")}</th>
                  <th className="px-4 py-2 text-right">{t("colQty")}</th>
                  <th className="px-4 py-2 text-right">{t("colRate")}</th>
                  <th className="px-4 py-2 text-right">{t("colAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(items ?? []).map((it) => {
                  const row = it as InvoiceItemRow;
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{row.product_name}</span>
                        <span className="ml-2 text-xs text-zinc-500">{row.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(row.unit_price))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(row.line_total))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inv.notes ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("notesSection")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {inv.notes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{t("subtotal")}</span>
              <span className="tabular-nums">{pkr.format(Number(inv.subtotal))}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{t("discount")}</span>
              <span className="tabular-nums">{pkr.format(Number(inv.discount_amount))}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {t("taxWithPct", { pct: Number(inv.tax_rate).toFixed(2) })}
              </span>
              <span className="tabular-nums">{pkr.format(Number(inv.tax_amount))}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold dark:border-zinc-800">
              <span>{t("total")}</span>
              <span className="tabular-nums">{pkr.format(total)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{t("paid")}</span>
              <span className="tabular-nums">{pkr.format(paid)}</span>
            </div>
            {balance > 0.001 ? (
              <div className="mt-2 flex justify-between text-sm font-medium text-amber-800 dark:text-amber-200">
                <span>{t("balance")}</span>
                <span className="tabular-nums">{pkr.format(balance)}</span>
              </div>
            ) : null}
          </div>

          {canEdit && inv.status === "draft" ? (
            <InvoiceFinalizeButtons invoiceId={id} totalAmount={total} />
          ) : null}

          {canEdit && (inv.status === "unpaid" || inv.status === "partial") && balance > 0.001 ? (
            <InvoicePaymentForm invoiceId={id} balanceDue={balance} />
          ) : null}
          {canEdit && isRestaurant && inv.status !== "cancelled" ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Order status</h3>
              <div className="mt-2">
                <RestaurantOrderStatusButtons
                  invoiceId={id}
                  currentStatus={
                    (inv.restaurant_order_status ?? "new") as
                      | "new"
                      | "preparing"
                      | "ready"
                      | "served"
                      | "settled"
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("paymentsSection")}</h3>
            {(payments ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">{t("noPayments")}</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {(payments ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800"
                  >
                    <span className="capitalize text-zinc-600 dark:text-zinc-400">
                      {paymentMethodLabel(tPay, p.method as string)}
                    </span>
                    <span className="tabular-nums font-medium">
                      {pkr.format(Number(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {showReverse ? (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-red-800 dark:text-red-200">
                {t("reverseSectionLabel")}
              </p>
              <div className="mt-2">
                <InvoiceReverseButton invoiceId={id} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
