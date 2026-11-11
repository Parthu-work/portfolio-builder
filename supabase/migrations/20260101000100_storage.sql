-- Public bucket for portfolio images. Uploads are resized in the browser to
-- ≤ 1600px WebP; the bucket enforces ≤ 2 MB and image types server-side.
-- Each user may only write inside a folder named after their own user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-assets', 'portfolio-assets', true, 2097152, array['image/webp', 'image/png', 'image/jpeg', 'image/avif'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "assets: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assets: update own" on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assets: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
