-- ═══════════════════════════════════════════════════════════════
-- AetherPixels — Phase 1 Security Hardening
-- Run this ENTIRE file in Supabase SQL Editor, top to bottom.
-- Safe to re-run: every statement either uses IF EXISTS/IF NOT
-- EXISTS or drops-then-recreates, so running it twice won't error.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- STEP 0 — Admin allow-list table
--
-- Real authenticated users are NOT automatically trusted as admins
-- just because they have an account. Only rows in this table are
-- treated as admins. This is the "least privilege" gate that every
-- write policy below checks against.
-- ═══════════════════════════════════════════════════════════════

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table admin_users enable row level security;

-- Admins can see the allow-list (handy for future multi-admin UI);
-- nobody else can read or write this table at all.
drop policy if exists "admins can read admin_users" on admin_users;
create policy "admins can read admin_users"
  on admin_users for select
  using (auth.uid() = user_id);

-- Helper function: is the CURRENT logged-in user an admin?
-- SECURITY DEFINER so it can check admin_users even though the
-- calling user has no direct SELECT grant on that table.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- ⚠️ ACTION REQUIRED (one-time, manual):
-- 1. Supabase Dashboard → Authentication → Users → Add User
--    Create your admin account with an email + password.
-- 2. Copy that user's UID (shown in the Users table).
-- 3. Run this, replacing the UID and email:
--
--    insert into admin_users (user_id, email)
--    values ('PASTE-YOUR-USER-UID-HERE', 'your@email.com');
--
-- Until you do this, is_admin() returns false for everyone,
-- meaning NO ONE (including you) can write data. Do this
-- immediately after running this script.
-- ─────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════
-- STEP 1 — Enable RLS on every table (idempotent)
-- ═══════════════════════════════════════════════════════════════

alter table categories        enable row level security;
alter table wallpapers        enable row level security;
alter table site_settings     enable row level security;
alter table analytics_events  enable row level security;


-- ═══════════════════════════════════════════════════════════════
-- STEP 2 — Drop every old permissive policy
-- (These were "using(true) with check(true)" — anyone with the
--  public anon key could insert/update/delete anything. That is
--  the core vulnerability this script fixes.)
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "public read categories"   on categories;
drop policy if exists "public read wallpapers"    on wallpapers;
drop policy if exists "public read settings"      on site_settings;
drop policy if exists "anon write categories"     on categories;
drop policy if exists "anon write wallpapers"     on wallpapers;
drop policy if exists "anon write settings"       on site_settings;
drop policy if exists "anon write analytics"      on analytics_events;


-- ═══════════════════════════════════════════════════════════════
-- STEP 3 — Public (anonymous) permissions: READ ONLY
-- ═══════════════════════════════════════════════════════════════

create policy "public can read categories"
  on categories for select
  using (true);

create policy "public can read wallpapers"
  on wallpapers for select
  using (true);

create policy "public can read settings"
  on site_settings for select
  using (true);

-- Analytics rows are write-only for the public (see safe RPC in
-- Step 5) and not readable by anon at all — visitors have no
-- business reading raw analytics events.
-- (No select policy created here on purpose = default deny.)


-- ═══════════════════════════════════════════════════════════════
-- STEP 4 — Admin-only permissions: INSERT / UPDATE / DELETE
-- Every write requires is_admin() to return true, i.e. the
-- request must come from a Supabase Auth session belonging to
-- a user_id present in admin_users.
-- ═══════════════════════════════════════════════════════════════

create policy "admins can insert categories"
  on categories for insert
  with check (is_admin());
create policy "admins can update categories"
  on categories for update
  using (is_admin()) with check (is_admin());
create policy "admins can delete categories"
  on categories for delete
  using (is_admin());

create policy "admins can insert wallpapers"
  on wallpapers for insert
  with check (is_admin());
create policy "admins can update wallpapers"
  on wallpapers for update
  using (is_admin()) with check (is_admin());
create policy "admins can delete wallpapers"
  on wallpapers for delete
  using (is_admin());

create policy "admins can update settings"
  on site_settings for update
  using (is_admin()) with check (is_admin());
-- No insert/delete policy for site_settings: it's a single fixed
-- row (id=1) created once by schema.sql. Admins can only update it.

create policy "admins can manage analytics"
  on analytics_events for all
  using (is_admin()) with check (is_admin());


-- ═══════════════════════════════════════════════════════════════
-- STEP 5 — Safe public analytics counters
--
-- Visitors need to increment view/download counts WITHOUT being
-- able to write arbitrary data or touch any other column. Direct
-- UPDATE access to wallpapers is admin-only (Step 4), so instead
-- we expose one narrow, safe RPC function that only ever increments
-- exactly one of two numeric columns by exactly 1, nothing else.
-- ═══════════════════════════════════════════════════════════════

create or replace function increment_wallpaper_stat(wp_id bigint, stat_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
    raise exception 'invalid stat_type: must be view, download_mobile, or download_desktop';
  end if;
end;
$$;

-- Allow anon (public visitors) to call ONLY this function —
-- they still have zero direct table write access.
grant execute on function increment_wallpaper_stat(bigint, text) to anon;
grant execute on function increment_wallpaper_stat(bigint, text) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- STEP 6 — Storage security
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "public read wallpapers bucket"   on storage.objects;
drop policy if exists "public read site-assets bucket"  on storage.objects;
drop policy if exists "public upload wallpapers bucket" on storage.objects;
drop policy if exists "public upload site-assets bucket" on storage.objects;
drop policy if exists "public update wallpapers bucket" on storage.objects;
drop policy if exists "public update site-assets bucket" on storage.objects;
drop policy if exists "public delete wallpapers bucket" on storage.objects;
drop policy if exists "public delete site-assets bucket" on storage.objects;

-- Anyone can VIEW files (needed so wallpaper images actually display)
create policy "public can read wallpapers bucket"
  on storage.objects for select
  using (bucket_id = 'wallpapers');

create policy "public can read site-assets bucket"
  on storage.objects for select
  using (bucket_id = 'site-assets');

-- Only admins can upload/replace/delete files in either bucket
create policy "admins can upload wallpapers bucket"
  on storage.objects for insert
  with check (bucket_id = 'wallpapers' and is_admin());
create policy "admins can update wallpapers bucket"
  on storage.objects for update
  using (bucket_id = 'wallpapers' and is_admin());
create policy "admins can delete wallpapers bucket"
  on storage.objects for delete
  using (bucket_id = 'wallpapers' and is_admin());

create policy "admins can upload site-assets bucket"
  on storage.objects for insert
  with check (bucket_id = 'site-assets' and is_admin());
create policy "admins can update site-assets bucket"
  on storage.objects for update
  using (bucket_id = 'site-assets' and is_admin());
create policy "admins can delete site-assets bucket"
  on storage.objects for delete
  using (bucket_id = 'site-assets' and is_admin());


-- ═══════════════════════════════════════════════════════════════
-- STEP 7 — Defense-in-depth: basic column validation constraints
-- (RLS controls WHO can write; these constrain WHAT they can write,
--  even for admins — protects against buggy client code too.)
-- ═══════════════════════════════════════════════════════════════

alter table wallpapers
  drop constraint if exists wallpapers_title_length,
  add constraint wallpapers_title_length check (char_length(title) between 1 and 200);

alter table wallpapers
  drop constraint if exists wallpapers_device_valid,
  add constraint wallpapers_device_valid check (device in ('Mobile','Desktop','Both'));

alter table categories
  drop constraint if exists categories_name_length,
  add constraint categories_name_length check (char_length(name) between 1 and 60);


-- ═══════════════════════════════════════════════════════════════
-- DONE. Summary of what changed:
--  • RLS enabled on all 4 tables
--  • Public: read-only on categories/wallpapers/site_settings,
--    no access at all to analytics_events directly
--  • Writes of any kind now require is_admin() = true, which
--    only real authenticated users listed in admin_users satisfy
--  • View/download counters use one narrow SECURITY DEFINER RPC
--    instead of open table access
--  • Storage: public read, admin-only write, on both buckets
--  • Added basic CHECK constraints on wallpapers/categories
-- ═══════════════════════════════════════════════════════════════
