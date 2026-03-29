-- Product photos: column + public storage bucket + RLS
-- Run in Supabase SQL Editor after previous migrations.

alter table products add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path layout: {business_id}/{product_id}/{filename}
drop policy if exists "product-images insert" on storage.objects;
drop policy if exists "product-images update" on storage.objects;
drop policy if exists "product-images delete" on storage.objects;

create policy "product-images insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );

create policy "product-images update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );

create policy "product-images delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select business_id::text from business_members where user_id = auth.uid()
    )
  );
