alter table public.businesses
  add column if not exists logo_url text;

comment on column public.businesses.logo_url is 'Public logo URL for business branding.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business-logos insert" on storage.objects;
drop policy if exists "business-logos update" on storage.objects;
drop policy if exists "business-logos delete" on storage.objects;

create policy "business-logos insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] in (
      select bm.business_id::text from public.business_members bm where bm.user_id = auth.uid()
    )
  );

create policy "business-logos update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] in (
      select bm.business_id::text from public.business_members bm where bm.user_id = auth.uid()
    )
  );

create policy "business-logos delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] in (
      select bm.business_id::text from public.business_members bm where bm.user_id = auth.uid()
    )
  );

create or replace function public.update_business_profile_settings(
  p_name text,
  p_logo_url text
)
returns void
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

  select bm.business_id into v_business_id
  from public.business_members bm
  where bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
  limit 1;

  if v_business_id is null then
    raise exception 'Access denied';
  end if;

  if length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'Business name required';
  end if;

  update public.businesses
  set
    name = trim(p_name),
    logo_url = nullif(trim(coalesce(p_logo_url, '')), '')
  where id = v_business_id;
end;
$$;

grant execute on function public.update_business_profile_settings(text, text) to authenticated;
