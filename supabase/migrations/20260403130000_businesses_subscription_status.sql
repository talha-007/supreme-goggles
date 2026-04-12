-- Default everyone to active until billing is wired; gate with NEXT_PUBLIC_BILLING_ENFORCE + app checks.

alter table public.businesses
  add column if not exists subscription_status text not null default 'active';

comment on column public.businesses.subscription_status is
  'active | trialing | past_due | cancelled — used when billing enforcement is enabled.';
