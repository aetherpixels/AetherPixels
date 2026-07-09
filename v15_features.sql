-- ═══════════════════════════════════════════════════════════════
-- AetherPixels v15.0 — Next Generation Features Schema
-- Run this AFTER final_audit_hardening.sql. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- STEP 1 — Tags (simple text array on wallpapers, no join table needed)
-- ═══════════════════════════════════════════════════════════════

alter table wallpapers add column if not exists tags text[] default '{}';
create index if not exists idx_wallpapers_tags on wallpapers using gin (tags);


-- ═══════════════════════════════════════════════════════════════
-- STEP 2 — Scheduled Publishing / Draft mode
--
-- No cron job needed: a wallpaper is publicly visible when
-- status = 'published', OR status = 'scheduled' AND publish_at
-- has already passed. The public read policy enforces this, so
-- a scheduled wallpaper "auto-publishes" the moment anyone loads
-- the site after its publish_at time — no background job required.
-- ═══════════════════════════════════════════════════════════════

alter table wallpapers add column if not exists status text default 'published';
alter table wallpapers add column if not exists publish_at timestamptz;

alter table wallpapers
  drop constraint if exists wallpapers_status_valid,
  add constraint wallpapers_status_valid check (status in ('draft','scheduled','published'));

-- Replace the public read policy to respect draft/scheduled status.
-- Admins still see everything (needed to manage drafts in the dashboard).
drop policy if exists "public can read wallpapers" on wallpapers;
create policy "public can read published wallpapers"
  on wallpapers for select
  using (
    status = 'published'
    or (status = 'scheduled' and publish_at is not null and publish_at <= now())
    or is_admin()
  );


-- ═══════════════════════════════════════════════════════════════
-- STEP 3 — User accounts use Supabase Auth directly (auth.users).
-- No extra table needed for basic signup/login/logout/reset —
-- that's all built into supabase.auth.* client methods. The tables
-- below are for the NEW user-specific features (favorites/collections).
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- STEP 4 — Favorites
-- ═══════════════════════════════════════════════════════════════

create table if not exists favorites (
  user_id uuid references auth.users(id) on delete cascade,
  wallpaper_id bigint references wallpapers(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, wallpaper_id)
);

alter table favorites enable row level security;

drop policy if exists "users manage own favorites" on favorites;
create policy "users manage own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Note: no public read policy — favorites are private to each user,
-- and there is intentionally no way for one user to see another's list.


-- ═══════════════════════════════════════════════════════════════
-- STEP 5 — Collections (a named group of wallpapers, owned by a user)
-- ═══════════════════════════════════════════════════════════════

create table if not exists collections (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz default now()
);

create table if not exists collection_items (
  collection_id bigint references collections(id) on delete cascade,
  wallpaper_id bigint references wallpapers(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (collection_id, wallpaper_id)
);

alter table collections enable row level security;
alter table collection_items enable row level security;

drop policy if exists "users manage own collections" on collections;
create policy "users manage own collections"
  on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own collection items" on collection_items;
create policy "users manage own collection items"
  on collection_items for all
  using (
    exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())
  );


-- ═══════════════════════════════════════════════════════════════
-- STEP 6 — Trending (computed from existing analytics_events —
-- no new table needed. Views/downloads already have created_at,
-- so "trending today/week/month" is just a time-windowed query.)
-- Admins need read access to analytics_events to power this and
-- the new dashboard widgets — currently they have none at all.
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "admins can read analytics" on analytics_events;
create policy "admins can read analytics"
  on analytics_events for select
  using (is_admin());

-- Trending score helper: weights downloads higher than views, since a
-- download is a stronger signal of genuine interest than a page view.
create or replace function get_trending_wallpapers(window_hours int, result_limit int default 12)
returns table(wallpaper_id bigint, score numeric)
language sql
stable
as $$
  select
    wallpaper_id,
    count(*) filter (where event_type = 'view')::numeric
      + count(*) filter (where event_type in ('download_mobile','download_desktop'))::numeric * 3 as score
  from analytics_events
  where created_at >= now() - (window_hours || ' hours')::interval
    and wallpaper_id is not null
  group by wallpaper_id
  order by score desc
  limit result_limit;
$$;

grant execute on function get_trending_wallpapers(int, int) to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
-- DONE. Reminder: run this once, then no further manual steps are
-- needed for tags, scheduled publishing, favorites, collections, or
-- trending — all pure schema/RLS, no cron/Edge Functions required.
-- ═══════════════════════════════════════════════════════════════
