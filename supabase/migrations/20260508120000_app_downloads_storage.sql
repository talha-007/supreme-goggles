-- Public APK downloads for the Taplite Android app.
-- Upload via Dashboard: Storage → app-downloads → upload e.g. android/app-release.apk (keep path in sync with NEXT_PUBLIC_ANDROID_APK_STORAGE_PATH on web).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-downloads',
  'app-downloads',
  true,
  104857600,
  array['application/vnd.android.package-archive', 'application/octet-stream']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app-downloads public read" on storage.objects;

create policy "app-downloads public read"
  on storage.objects for select
  using (bucket_id = 'app-downloads');
