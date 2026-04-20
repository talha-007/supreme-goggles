import { ExpenseCreateForm } from "@/components/expenses/expense-create-form";
import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewExpensePage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard/expenses");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/expenses"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Expenses
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Add expense
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Track daily operating costs for this business.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <ExpenseCreateForm />
      </div>
    </div>
  );
}
