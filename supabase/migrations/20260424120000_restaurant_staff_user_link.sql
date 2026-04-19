alter table public.restaurant_staff
  add column if not exists user_id uuid null references auth.users (id) on delete set null;

create unique index if not exists restaurant_staff_business_user_unique
  on public.restaurant_staff (business_id, user_id)
  where user_id is not null;

create index if not exists restaurant_staff_business_user_active_idx
  on public.restaurant_staff (business_id, user_id, is_active);
