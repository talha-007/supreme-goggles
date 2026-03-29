-- If purchase_orders / suppliers existed before 20260329160000, they may lack updated_at.
-- PostgREST then errors: "Could not find the 'updated_at' column ... in the schema cache"

alter table public.purchase_orders
  add column if not exists updated_at timestamptz not null default now();

alter table public.suppliers
  add column if not exists updated_at timestamptz not null default now();
