import { CustomerDeleteForm } from "@/components/customers/customer-delete-form";
import { CustomerEditForm } from "@/components/customers/customer-edit-form";
import {
  CustomerInvoicesSection,
  type CustomerInvoiceListRow,
} from "@/components/customers/customer-invoices-section";
import {
  requireBusinessContext,
  canManageCustomers,
  canDeleteCustomers,
  guardOwnerPage,
} from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { CustomerRow } from "@/types/customer";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const CUSTOMER_INVOICES_PAGE_SIZE = 20;

function parseInvoicePage(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 1;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoicePage?: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageCustomers(ctx.role)) {
    redirect("/dashboard/customers");
  }

  const { id } = await params;
  const sp = await searchParams;
  const requestedPage = parseInvoicePage(sp.invoicePage);
  const supabase = await createClient();

  const [{ data: row, error }, countRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("business_id", ctx.businessId).maybeSingle(),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", ctx.businessId)
      .eq("customer_id", id),
  ]);

  if (countRes.error) {
    throw new Error(`Failed to count invoices: ${countRes.error.message}`);
  }

  const invoiceTotal = countRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(invoiceTotal / CUSTOMER_INVOICES_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const from = (page - 1) * CUSTOMER_INVOICES_PAGE_SIZE;
  const to = from + CUSTOMER_INVOICES_PAGE_SIZE - 1;

  const { data: invoiceRows, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_amount, paid_amount, created_at")
    .eq("business_id", ctx.businessId)
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (invErr) {
    throw new Error(`Failed to load invoices: ${invErr.message}`);
  }

  if (error) {
    throw new Error(`Failed to load customer: ${error.message}`);
  }
  if (!row) {
    notFound();
  }

  const customer = row as CustomerRow;
  const canDelete = canDeleteCustomers(ctx.role);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          Edit customer
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{customer.name}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CustomerEditForm customer={customer} />
        {canDelete ? (
          <CustomerDeleteForm
            customerId={customer.id}
            outstandingBalance={customer.outstanding_balance}
          />
        ) : null}
      </div>
      <CustomerInvoicesSection
        customerId={customer.id}
        invoices={(invoiceRows ?? []) as CustomerInvoiceListRow[]}
        page={page}
        pageSize={CUSTOMER_INVOICES_PAGE_SIZE}
        totalCount={invoiceTotal}
      />
    </div>
  );
}
