-- When the trial ends (nullable for legacy / paid-without-end-date).
alter table public.businesses
  add column if not exists subscription_ends_at timestamptz;

comment on column public.businesses.subscription_ends_at is
  'Trial or paid plan end; used with subscription_status (e.g. trialing until this instant).';

-- New shops start on trial with an end date (was default active with no date).
create or replace function public.create_business_with_owner(
  p_name text,
  p_type public.business_type default 'shop'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(p_name)) < 1 then
    raise exception 'Business name required';
  end if;

  insert into public.businesses (name, type, subscription_status, subscription_ends_at)
  values (
    trim(p_name),
    p_type,
    'trialing',
    now() + interval '14 days'
  )
  returning id into v_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_business_id, auth.uid(), 'owner');

  return v_business_id;
end;
$$;
