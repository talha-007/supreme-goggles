create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  seats integer not null default 4 check (seats > 0 and seats <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_tables_business_name_unique unique (business_id, name)
);

create table if not exists public.restaurant_waiters (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_waiters_business_name_unique unique (business_id, name)
);

create index if not exists restaurant_tables_business_idx
  on public.restaurant_tables (business_id, is_active, name);
create index if not exists restaurant_waiters_business_idx
  on public.restaurant_waiters (business_id, is_active, name);

drop trigger if exists trg_restaurant_tables_updated_at on public.restaurant_tables;
create trigger trg_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.touch_updated_at();

drop trigger if exists trg_restaurant_waiters_updated_at on public.restaurant_waiters;
create trigger trg_restaurant_waiters_updated_at
before update on public.restaurant_waiters
for each row execute function public.touch_updated_at();

alter table public.restaurant_tables enable row level security;
alter table public.restaurant_waiters enable row level security;

drop policy if exists restaurant_tables_select on public.restaurant_tables;
create policy restaurant_tables_select on public.restaurant_tables
for select to authenticated
using (business_id in (select bm.business_id from public.business_members bm where bm.user_id = auth.uid()));

drop policy if exists restaurant_tables_write on public.restaurant_tables;
create policy restaurant_tables_write on public.restaurant_tables
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

drop policy if exists restaurant_waiters_select on public.restaurant_waiters;
create policy restaurant_waiters_select on public.restaurant_waiters
for select to authenticated
using (business_id in (select bm.business_id from public.business_members bm where bm.user_id = auth.uid()));

drop policy if exists restaurant_waiters_write on public.restaurant_waiters;
create policy restaurant_waiters_write on public.restaurant_waiters
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
