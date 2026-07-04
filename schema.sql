-- ═══════════════════════════════════════════════════════════
-- AetherPixels — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Categories ──────────────────────────────────────────────
create table if not exists categories (
  id text primary key,
  name text not null,
  icon text default '🖼️',
  image_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── Wallpapers ──────────────────────────────────────────────
create table if not exists wallpapers (
  id bigint generated always as identity primary key,
  title text not null,
  category text references categories(id) on delete set null,
  device text default 'Desktop',
  badge text default '4K',
  image_url text not null,       -- full-size (compressed webp)
  thumb_url text,                -- small thumbnail (grid cards)
  width int,
  height int,
  views int default 0,
  downloads int default 0,
  created_at timestamptz default now()
);

-- ── Site settings (single row, key/value JSON) ─────────────
create table if not exists site_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into site_settings (id, data) values (1, '{}') on conflict (id) do nothing;

-- ── Analytics events (raw log, optional granular tracking) ─
create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  wallpaper_id bigint references wallpapers(id) on delete cascade,
  event_type text not null check (event_type in ('view','download_mobile','download_desktop')),
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security
-- Public can READ everything. Only requests bearing the admin
-- password check (done in app code) are allowed to WRITE —
-- for simplicity here we allow anon WRITE too, since the anon
-- key is already semi-private and the admin panel is the only
-- place write calls originate from. For stronger security later,
-- swap this for Supabase Auth + policies scoped to a logged-in
-- admin user.
-- ═══════════════════════════════════════════════════════════

alter table categories        enable row level security;
alter table wallpapers        enable row level security;
alter table site_settings     enable row level security;
alter table analytics_events  enable row level security;

create policy "public read categories"  on categories  for select using (true);
create policy "public read wallpapers"  on wallpapers  for select using (true);
create policy "public read settings"    on site_settings for select using (true);

create policy "anon write categories"   on categories  for all using (true) with check (true);
create policy "anon write wallpapers"   on wallpapers  for all using (true) with check (true);
create policy "anon write settings"     on site_settings for all using (true) with check (true);
create policy "anon write analytics"    on analytics_events for all using (true) with check (true);

-- ═══════════════════════════════════════════════════════════
-- Seed data (matches your current placeholder wallpapers)
-- Safe to skip/edit — admin panel can add more afterwards.
-- ═══════════════════════════════════════════════════════════

insert into categories (id, name, icon, sort_order) values
  ('cars','Cars','🚗',1),
  ('nature','Nature','⛰️',2),
  ('space','Space','🪐',3),
  ('gaming','Gaming','🎮',4),
  ('abstract','Abstract','🔶',5),
  ('amoled','AMOLED','🌑',6)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════
-- Storage buckets — create these manually in the dashboard:
-- Storage → New bucket → name: "wallpapers"  → Public bucket: ON
-- Storage → New bucket → name: "site-assets" → Public bucket: ON
-- (Public ON = anyone with the link can view/download images,
--  which is what you want for a wallpaper site)
-- ═══════════════════════════════════════════════════════════
