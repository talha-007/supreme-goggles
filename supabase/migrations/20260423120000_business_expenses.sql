create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  expense_date date not null default current_date,
  category text not null default 'general',
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text,
  vendor_name text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_expenses_business_date_idx
  on public.business_expenses (business_id, expense_date desc);

create index if not exists business_expenses_business_category_idx
  on public.business_expenses (business_id, category);

drop trigger if exists trg_business_expenses_updated_at on public.business_expenses;
create trigger trg_business_expenses_updated_at
before update on public.business_expenses
for each row execute function public.touch_updated_at();

alter table public.business_expenses enable row level security;

drop policy if exists business_expenses_select on public.business_expenses;
create policy business_expenses_select on public.business_expenses
for select to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);

drop policy if exists business_expenses_insert on public.business_expenses;
create policy business_expenses_insert on public.business_expenses
for insert to authenticated
with check (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);

drop policy if exists business_expenses_update on public.business_expenses;
create policy business_expenses_update on public.business_expenses
for update to authenticated
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

drop policy if exists business_expenses_delete on public.business_expenses;
create policy business_expenses_delete on public.business_expenses
for delete to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);
