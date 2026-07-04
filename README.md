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
2. Run `sql/schema.sql` in the SQL Editor
3. Run `sql/storage_policies.sql` in the SQL Editor
4. Create two **public** storage buckets: `wallpapers` and `site-assets`
5. Your Project URL + Publishable key are already filled into `supabase-client.js` — if you ever create a new Supabase project, update those two lines at the top of that file.

## 🔑 Admin access

Visit `https://<your-domain>/admin.html` and log in with your admin password (set inside `admin.html`, search for `const PW =`). This panel is where you manage all wallpapers, categories, hero text, and social links — changes save to Supabase and are visible to every visitor immediately.

## ⚠️ Before going live, double check

- [ ] `supabase-client.js` has your real Supabase URL + key (not placeholders)
- [ ] Both storage buckets exist and are set to Public
- [ ] `sitemap.xml` and `robots.txt` reference your actual domain
- [ ] Admin password in `admin.html` has been changed to something only you know
