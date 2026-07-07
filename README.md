# AetherPixels

Premium AI-crafted wallpaper site. Static frontend (HTML/CSS/JS) + Supabase backend (database + storage).

## 🚀 Deploy to GitHub Pages

1. Upload **every file in this folder** to the root of your GitHub repo (keep the `sql/` folder too, even though it's not used by the live site — it's reference material for your database).
2. In your repo settings → Pages → set source to your main branch, root folder.
3. Your site goes live at `https://<username>.github.io/<repo-name>/`.

## 📁 File guide

| File | Purpose |
|---|---|
| `index.html` | Homepage — hero, categories, latest wallpapers |
| `category.html` | Browse/filter wallpapers by category (or all) |
| `latest.html` | Newest wallpapers, newest first |
| `wallpaper.html` | Single wallpaper detail + download page (`?id=123`) |
| `about.html` | About page + contact form |
| `admin.html` | **Password-protected** admin panel — add/edit/delete/bulk-upload wallpapers, edit hero/about text, social links. Keep this URL private. |
| `style.css` | All site styling |
| `script.js` | Shared UI logic — nav, search, download modal, rendering wallpaper/category grids |
| `supabase-client.js` | All Supabase database + storage calls. **Contains your Project URL and API key.** |
| `image-utils.js` | Client-side image compression, WebP conversion, thumbnail generation (used by admin panel uploads) |
| `logo.png` | Site logo, used in navbar/footer/favicon |
| `hero_image.jpeg` | Default homepage hero background |
| `sitemap.xml` / `robots.txt` | SEO — search engine crawling rules and page listing |
| `sql/schema.sql` | Run once in Supabase SQL Editor to create tables (`wallpapers`, `categories`, `site_settings`, `analytics_events`) |
| `sql/storage_policies.sql` | Run once in Supabase SQL Editor to allow the admin panel to upload/edit/delete files in storage |

## 🔧 Backend setup (Supabase) — one-time

1. Create a free project at [supabase.com](https://supabase.com)
2. Run `sql/schema.sql` in the SQL Editor (creates tables + read-only public policies)
3. Run `sql/security_hardening.sql` in the SQL Editor (real RLS, admin-only write policies, Supabase Auth gate, storage policies)
4. Run `sql/final_audit_hardening.sql` in the SQL Editor (bucket-level file size/type limits, extra hardening)
5. Create two **public** storage buckets: `wallpapers` and `site-assets`
6. **Create your admin login:** Supabase Dashboard → Authentication → Users → Add User (email + password). Copy the generated User UID, then run in SQL Editor:
   ```sql
   insert into admin_users (user_id, email) values ('paste-uid-here', 'your@email.com');
   ```
   Until this step is done, no one — including you — can write any data. This is intentional (least-privilege by default).
7. Your Project URL + Publishable key are already filled into `supabase-client.js` — if you ever create a new Supabase project, update those two lines at the top of that file.

⚠️ Do **not** run `sql/storage_policies.sql` — it's a deliberately neutralized leftover from an earlier, less secure setup. Kept only so the file's warning comment explains why, in case anyone finds it.

## 🔑 Admin access

Visit `https://<your-domain>/admin.html` and sign in with the email + password you created in Supabase Auth (not a hardcoded panel password anymore — see Security section below). This panel is where you manage all wallpapers, categories, hero text, and social links — changes save to Supabase and are visible to every visitor immediately.

## 🔒 Security

- **Row Level Security** is enabled on every table. The public (anon) key can only ever *read* wallpapers/categories/site_settings — never write.
- **Writes require real authentication.** Every insert/update/delete is gated by an `is_admin()` check tied to Supabase Auth, not a client-side password.
- **View/download counters** use one narrow, safe database function (`increment_wallpaper_stat`) instead of open table access — visitors can increment a counter and nothing else.
- **Storage buckets** are public-read, admin-only write, with server-side file size (20MB) and MIME-type (JPEG/PNG/WebP/GIF) limits enforced at the bucket level — not just in the browser.
- **A Content-Security-Policy** and **Referrer-Policy** are set via `<meta>` tags on every page (see `_headers` for the full policy — GitHub Pages can't set real HTTP headers, so this is the closest equivalent available).
- User-generated text (wallpaper titles, category names) is HTML-escaped before being inserted into the page, preventing stored-XSS.

## ⚠️ Before going live, double check

- [ ] `supabase-client.js` has your real Supabase URL + key (not placeholders)
- [ ] Both storage buckets exist and are set to Public
- [ ] All three SQL files have been run, in order: `schema.sql` → `security_hardening.sql` → `final_audit_hardening.sql`
- [ ] Your admin user exists in Supabase Auth AND has a matching row in `admin_users`
- [ ] `sitemap.xml` and `robots.txt` reference your actual domain
