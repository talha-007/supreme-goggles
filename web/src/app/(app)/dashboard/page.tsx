import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as {user?.email}. Next: wire products, invoices, and reports to your Supabase
        tables.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Quick actions</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add products, create invoices, and record payments — coming next on the roadmap.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Database</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Your schema in <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">schema.sql</code>{" "}
            is ready; this UI will call those tables next.
          </p>
        </div>
      </div>
    </div>
  );
}
