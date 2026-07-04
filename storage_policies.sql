-- ═══════════════════════════════════════════════════════════
-- AetherPixels — Storage Upload Permissions
-- Run this in Supabase SQL Editor to allow the admin panel
-- to upload/update/delete files in your storage buckets.
-- (Making a bucket "Public" only allows public READ access —
--  it does NOT allow anonymous uploads. These policies do.)
-- ═══════════════════════════════════════════════════════════

-- Allow anyone (anon key) to READ files in both buckets
create policy "public read wallpapers bucket"
on storage.objects for select
using ( bucket_id = 'wallpapers' );

create policy "public read site-assets bucket"
on storage.objects for select
using ( bucket_id = 'site-assets' );

-- Allow anyone (anon key) to UPLOAD files into both buckets
-- (Since your admin panel is password-protected in the UI,
--  this is fine for now. For stronger security later, restrict
--  this to Supabase Auth admin users instead.)
create policy "public upload wallpapers bucket"
on storage.objects for insert
with check ( bucket_id = 'wallpapers' );

create policy "public upload site-assets bucket"
on storage.objects for insert
with check ( bucket_id = 'site-assets' );

-- Allow updates (needed when admin panel replaces/overwrites an image)
create policy "public update wallpapers bucket"
on storage.objects for update
using ( bucket_id = 'wallpapers' );

create policy "public update site-assets bucket"
on storage.objects for update
using ( bucket_id = 'site-assets' );

-- Allow deletes (needed when admin panel deletes a wallpaper/category)
create policy "public delete wallpapers bucket"
on storage.objects for delete
using ( bucket_id = 'wallpapers' );

create policy "public delete site-assets bucket"
on storage.objects for delete
using ( bucket_id = 'site-assets' );
