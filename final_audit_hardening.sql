-- ═══════════════════════════════════════════════════════════════
-- AetherPixels — Final Production Audit: Additional Hardening
-- Run this AFTER security_hardening.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- STEP 1 — Bucket-level file restrictions (server-side backstop)
--
-- The admin panel already validates file size/type in JavaScript
-- before upload (see image-utils.js). But client-side validation
-- can ALWAYS be bypassed — someone could call the Supabase Storage
-- API directly with any tool, skipping the browser entirely. This
-- sets the same limits at the bucket level, enforced by Supabase
-- itself regardless of how the upload request was made.
-- ═══════════════════════════════════════════════════════════════

update storage.buckets
set
  file_size_limit = 20971520, -- 20MB, matches image-utils.js MAX_UPLOAD_BYTES
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'wallpapers';

update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'site-assets';


-- ═══════════════════════════════════════════════════════════════
-- STEP 2 — Verify RLS is actually enabled (defensive re-check)
-- If any of these were somehow disabled, this turns them back on.
-- No-op if already enabled.
-- ═══════════════════════════════════════════════════════════════

alter table categories        enable row level security;
alter table wallpapers        enable row level security;
alter table site_settings     enable row level security;
alter table analytics_events  enable row level security;
alter table admin_users       enable row level security;


-- ═══════════════════════════════════════════════════════════════
-- STEP 3 — Lock down the increment_wallpaper_stat RPC further
--
-- Defense-in-depth: even though this function is intentionally
-- callable by anon (visitors need to trigger view/download counts),
-- add an explicit guard against garbage input beyond what the
-- IF/ELSIF already checks, and ensure it can't be used to probe
-- for the existence of wallpaper IDs that don't exist (silently
-- no-ops instead of erroring, which would leak information).
-- ═══════════════════════════════════════════════════════════════

create or replace function increment_wallpaper_stat(wp_id bigint, stat_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Silently do nothing for a non-existent wallpaper ID instead of
  -- erroring — prevents this endpoint being used to enumerate/probe
  -- which wallpaper IDs exist in the database.
  if not exists (select 1 from wallpapers where id = wp_id) then
    return;
  end if;

  if stat_type = 'view' then
    update wallpapers set views = coalesce(views,0) + 1 where id = wp_id;
    insert into analytics_events (wallpaper_id, event_type) values (wp_id, 'view');
  elsif stat_type = 'download_mobile' then
    update wallpapers set downloads = coalesce(downloads,0) + 1 where id = wp_id;
    insert into analytics_events (wallpaper_id, event_type) values (wp_id, 'download_mobile');
  elsif stat_type = 'download_desktop' then
    update wallpapers set downloads = coalesce(downloads,0) + 1 where id = wp_id;
    insert into analytics_events (wallpaper_id, event_type) values (wp_id, 'download_desktop');
  else
    -- Invalid stat_type is a programming error, not visitor input,
    -- so it's fine for this branch to still raise.
    raise exception 'invalid stat_type: must be view, download_mobile, or download_desktop';
  end if;
end;
$$;

grant execute on function increment_wallpaper_stat(bigint, text) to anon;
grant execute on function increment_wallpaper_stat(bigint, text) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- STEP 4 — Confirm no other tables were accidentally left open
-- (Lists every table in the public schema and its RLS status —
--  run this as a SELECT to manually eyeball the results; every
--  row should show rowsecurity = true.)
-- ═══════════════════════════════════════════════════════════════

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- ═══════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════
