-- Run in Supabase SQL Editor if not using CLI migrations.
-- Lets new users create a business + owner membership (RLS blocks direct inserts).

create or replace function create_business_with_owner(
  p_name text,
  p_type business_type default 'shop'
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

  insert into businesses (name, type)
  values (trim(p_name), p_type)
  returning id into v_business_id;

  insert into business_members (business_id, user_id, role)
  values (v_business_id, auth.uid(), 'owner');

  return v_business_id;
end;
$$;

grant execute on function create_business_with_owner(text, business_type) to authenticated;
