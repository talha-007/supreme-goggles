create table if not exists public.restaurant_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null unique references public.invoices(id) on delete cascade,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  waiter_id uuid references public.restaurant_staff(id) on delete set null,
  status text not null check (status in ('new', 'preparing', 'ready', 'served', 'settled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurant_orders_business_status_idx
  on public.restaurant_orders (business_id, status, updated_at desc);

create index if not exists restaurant_orders_waiter_idx
  on public.restaurant_orders (business_id, waiter_id, updated_at desc);

drop trigger if exists trg_restaurant_orders_updated_at on public.restaurant_orders;
create trigger trg_restaurant_orders_updated_at
before update on public.restaurant_orders
for each row execute function public.touch_updated_at();

alter table public.restaurant_orders enable row level security;

drop policy if exists restaurant_orders_select on public.restaurant_orders;
create policy restaurant_orders_select on public.restaurant_orders
for select to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);

drop policy if exists restaurant_orders_write on public.restaurant_orders;
create policy restaurant_orders_write on public.restaurant_orders
for all to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
)
with check (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);

insert into public.restaurant_orders (business_id, invoice_id, table_id, waiter_id, status)
select
  i.business_id,
  i.id,
  i.restaurant_table_id,
  i.waiter_id,
  i.restaurant_order_status
from public.invoices i
where i.restaurant_order_status in ('new', 'preparing', 'ready', 'served', 'settled')
on conflict (invoice_id) do update
set
  table_id = excluded.table_id,
  waiter_id = excluded.waiter_id,
  status = excluded.status,
  updated_at = now();

alter publication supabase_realtime add table public.restaurant_orders;
