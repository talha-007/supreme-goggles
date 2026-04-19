alter type public.business_type add value if not exists 'general_store';
alter type public.business_type add value if not exists 'restaurant';
alter type public.business_type add value if not exists 'pharmacy';

create table if not exists public.business_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  enable_table_service boolean not null default false,
  enable_batch_expiry boolean not null default false,
  enable_prescription_flow boolean not null default false,
  enable_kot_printing boolean not null default false,
  enable_quick_service_mode boolean not null default true,
  default_tax_mode text not null default 'exclusive',
  rounding_rule text not null default 'nearest_0_01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_default_tax_mode_check
    check (default_tax_mode in ('inclusive', 'exclusive')),
  constraint business_settings_rounding_rule_check
    check (rounding_rule in ('none', 'nearest_0_01', 'nearest_0_05', 'nearest_1'))
);

drop trigger if exists trg_business_settings_updated_at on public.business_settings;
create trigger trg_business_settings_updated_at
before update on public.business_settings
for each row execute function public.touch_updated_at();

insert into public.business_settings (
  business_id,
  enable_table_service,
  enable_batch_expiry,
  enable_prescription_flow,
  enable_kot_printing,
  enable_quick_service_mode,
  default_tax_mode,
  rounding_rule
)
select
  b.id,
  (b.type = 'restaurant'),
  (b.type = 'pharmacy'),
  (b.type = 'pharmacy'),
  (b.type = 'restaurant'),
  (b.type <> 'restaurant'),
  'exclusive',
  'nearest_0_01'
from public.businesses b
on conflict (business_id) do nothing;

alter table public.business_settings enable row level security;

drop policy if exists business_settings_select on public.business_settings;
create policy business_settings_select on public.business_settings
for select to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
  )
);

drop policy if exists business_settings_insert on public.business_settings;
create policy business_settings_insert on public.business_settings
for insert to authenticated
with check (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
      and bm.role in ('owner', 'manager')
  )
);

drop policy if exists business_settings_update on public.business_settings;
create policy business_settings_update on public.business_settings
for update to authenticated
using (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
      and bm.role in ('owner', 'manager')
  )
)
with check (
  business_id in (
    select bm.business_id
    from public.business_members bm
    where bm.user_id = auth.uid()
      and bm.role in ('owner', 'manager')
  )
);
