alter table public.invoices
  drop constraint if exists invoices_restaurant_order_status_check;

alter table public.invoices
  add constraint invoices_restaurant_order_status_check
  check (restaurant_order_status in ('new', 'preparing', 'ready', 'served', 'settled'));

create table if not exists public.restaurant_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  role text not null check (role in ('waiter', 'chef', 'counter')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_staff_business_name_role_unique unique (business_id, name, role)
);

create index if not exists restaurant_staff_business_role_idx
  on public.restaurant_staff (business_id, role, is_active, name);

drop trigger if exists trg_restaurant_staff_updated_at on public.restaurant_staff;
create trigger trg_restaurant_staff_updated_at
before update on public.restaurant_staff
for each row execute function public.touch_updated_at();

alter table public.restaurant_staff enable row level security;

drop policy if exists restaurant_staff_select on public.restaurant_staff;
create policy restaurant_staff_select on public.restaurant_staff
for select to authenticated
using (business_id in (select bm.business_id from public.business_members bm where bm.user_id = auth.uid()));

drop policy if exists restaurant_staff_write on public.restaurant_staff;
create policy restaurant_staff_write on public.restaurant_staff
for all to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
  )
)
with check (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
  )
);
