// ═══════════════════════════════════════════════════════════
// AetherPixels — Supabase Client
// Fill in your project URL + anon key below, then this file
// This is the single source of truth for site data (Supabase-backed).
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL      = "https://opxcfhfbbzxsgqaztgjg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_52SPlqrioKB4ivke2417aQ_cSZl4Igy";

let _sb = null;
function sbClient(){
  if(_sb) return _sb;
  if(typeof window.supabase === "undefined"){
    console.error("Supabase JS library not loaded. Check the <script> tag order.");
    return null;
  }
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

function sbConfigured(){
  return SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY";
}

// ─── FETCH (public pages) ────────────────────────────────────
// Each fetch is individually try/caught so a network blip or
// error in ONE of these (wallpapers/categories/settings) never
// silently takes the others down too — every function always
// resolves to a safe empty value instead of throwing.
async function sbFetchWallpapers(){
  try{
    const sb = sbClient();
    if(!sb) return [];
    const { data, error } = await sb.from("wallpapers").select("*").order("created_at", { ascending: false });
    if(error){ console.error("sbFetchWallpapers error:", error.message || error); return []; }
    if(!data) return [];
    return data.map(w => ({
      id: w.id,
      title: w.title,
      category: w.category,
      device: w.device || "Desktop",
      badge: w.badge || "4K",
      img: w.image_url,
      _resolvedImg: w.thumb_url || w.image_url,
      _fullImg: w.image_url,
      width: w.width,
      height: w.height,
      views: w.views || 0,
      downloads: w.downloads || 0
    }));
  }catch(err){
    console.error("sbFetchWallpapers threw an exception (likely network/connectivity issue):", err);
    return [];
  }
}

async function sbFetchCategories(){
  try{
    const sb = sbClient();
    if(!sb) return [];
    const { data, error } = await sb.from("categories").select("*").order("sort_order", { ascending: true });
    if(error){ console.error("sbFetchCategories error:", error.message || error); return []; }
    if(!data) return [];
    return data.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || "🖼️",
      img: c.image_url,
      _resolvedImg: c.image_url
    }));
  }catch(err){
    console.error("sbFetchCategories threw an exception (likely network/connectivity issue):", err);
    return [];
  }
}

async function sbFetchSettings(){
  try{
    const sb = sbClient();
    if(!sb) return {};
    const { data, error } = await sb.from("site_settings").select("data").eq("id", 1).single();
    if(error){ console.error("sbFetchSettings error:", error.message || error); return {}; }
    return data?.data || {};
  }catch(err){
    console.error("sbFetchSettings threw an exception (likely network/connectivity issue):", err);
    return {};
  }
}

// ─── STORAGE UPLOAD ───────────────────────────────────────────
// Uploads a processed image (blob) to a bucket, returns its public URL.
async function sbUploadFile(bucket, path, blob){
  const sb = sbClient();
  const { error } = await sb.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/webp",
    upsert: true
  });
  if(error){ console.error("sbUploadFile:", error); throw error; }
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function sbDeleteFile(bucket, path){
  const sb = sbClient();
  await sb.storage.from(bucket).remove([path]);
}

// ─── WALLPAPERS: WRITE ────────────────────────────────────────
// `files` = { full: Blob, thumb: Blob } already compressed/converted to WebP
async function sbAddWallpaper({ title, category, device, badge, files, width, height }){
  const sb = sbClient();
  const stamp = Date.now();
  const fullPath  = `full/${stamp}.webp`;
  const thumbPath = `thumb/${stamp}.webp`;

  const [fullUrl, thumbUrl] = await Promise.all([
    sbUploadFile("wallpapers", fullPath, files.full),
    sbUploadFile("wallpapers", thumbPath, files.thumb)
  ]);

  const { data, error } = await sb.from("wallpapers").insert({
    title, category, device, badge,
    image_url: fullUrl, thumb_url: thumbUrl,
    width, height
  }).select().single();

  if(error){ console.error("sbAddWallpaper:", error); throw error; }
  return data;
}

async function sbUpdateWallpaper(id, patch, files){
  const sb = sbClient();
  const updates = { ...patch };

  if(files){
    const stamp = Date.now();
    const fullPath  = `full/${stamp}.webp`;
    const thumbPath = `thumb/${stamp}.webp`;
    const [fullUrl, thumbUrl] = await Promise.all([
      sbUploadFile("wallpapers", fullPath, files.full),
      sbUploadFile("wallpapers", thumbPath, files.thumb)
    ]);
    updates.image_url = fullUrl;
    updates.thumb_url = thumbUrl;
  }

  const { error } = await sb.from("wallpapers").update(updates).eq("id", id);
  if(error){ console.error("sbUpdateWallpaper:", error); throw error; }
}

async function sbDeleteWallpaper(id){
  const sb = sbClient();
  const { error } = await sb.from("wallpapers").delete().eq("id", id);
  if(error){ console.error("sbDeleteWallpaper:", error); throw error; }
}

// ─── CATEGORIES: WRITE ─────────────────────────────────────────
async function sbAddCategory({ id, name, icon, file }){
  const sb = sbClient();
  let imageUrl = null;
  if(file){
    imageUrl = await sbUploadFile("site-assets", `categories/${id}.webp`, file);
  }
  const { error } = await sb.from("categories").insert({ id, name, icon, image_url: imageUrl });
  if(error){ console.error("sbAddCategory:", error); throw error; }
}

async function sbUpdateCategory(id, patch, file){
  const sb = sbClient();
  const updates = { ...patch };
  if(file){
    updates.image_url = await sbUploadFile("site-assets", `categories/${id}.webp`, file);
  }
  const { error } = await sb.from("categories").update(updates).eq("id", id);
  if(error){ console.error("sbUpdateCategory:", error); throw error; }
}

async function sbDeleteCategory(id){
  const sb = sbClient();
  const { error } = await sb.from("categories").delete().eq("id", id);
  if(error){ console.error("sbDeleteCategory:", error); throw error; }
}

// ─── SETTINGS: WRITE ────────────────────────────────────────────
async function sbSaveSettings(patch){
  const sb = sbClient();
  const current = await sbFetchSettings();
  const merged = { ...current, ...patch };
  const { error } = await sb.from("site_settings").update({ data: merged, updated_at: new Date().toISOString() }).eq("id", 1);
  if(error){ console.error("sbSaveSettings:", error); throw error; }
  return merged;
}

// ─── ANALYTICS ────────────────────────────────────────────────
async function sbTrackView(wallpaperId){
  const sb = sbClient();
  if(!sb) return;
  await sb.from("analytics_events").insert({ wallpaper_id: wallpaperId, event_type: "view" });
  await sb.rpc("increment_views", { wp_id: wallpaperId }).catch(() => {
    // fallback if RPC function doesn't exist: manual increment
    sb.from("wallpapers").select("views").eq("id", wallpaperId).single().then(({data}) => {
      if(data) sb.from("wallpapers").update({ views: (data.views||0)+1 }).eq("id", wallpaperId).then(()=>{});
    });
  });
}

async function sbTrackDownload(wallpaperId, mode){
  const sb = sbClient();
  if(!sb) return;
  await sb.from("analytics_events").insert({ wallpaper_id: wallpaperId, event_type: mode==="mobile" ? "download_mobile" : "download_desktop" });
  const { data } = await sb.from("wallpapers").select("downloads").eq("id", wallpaperId).single();
  if(data) await sb.from("wallpapers").update({ downloads: (data.downloads||0)+1 }).eq("id", wallpaperId);
}

// ─── APPLY TO PAGE ──────────────────────────────────────────
// Loads live wallpapers/categories/settings from Supabase and
// puts them on window.WALLPAPERS / window.CATEGORIES for the
// existing render functions in script.js to use.
async function sbApplyToPage(){
  if(!sbConfigured()){
    console.error("Supabase is not configured — edit supabase-client.js with your Project URL and Publishable key.");
    window.WALLPAPERS = [];
    window.CATEGORIES = [];
    return;
  }
  try{
    // Promise.allSettled (not Promise.all) means even if one of these three
    // somehow still throws, the other two still resolve normally instead of
    // all three being wiped out together.
    const results = await Promise.allSettled([
      sbFetchWallpapers(),
      sbFetchCategories(),
      sbFetchSettings()
    ]);

    const [wpResult, catResult, settingsResult] = results;

    window.WALLPAPERS = wpResult.status === "fulfilled" ? wpResult.value : [];
    window.CATEGORIES = catResult.status === "fulfilled" ? catResult.value : [];
    window.AP_SETTINGS = settingsResult.status === "fulfilled" ? settingsResult.value : {};

    if(wpResult.status === "rejected")  console.error("Wallpapers failed to load:", wpResult.reason);
    if(catResult.status === "rejected") console.error("Categories failed to load:", catResult.reason);
    if(settingsResult.status === "rejected") console.error("Settings failed to load:", settingsResult.reason);

    console.log(`AetherPixels: loaded ${window.WALLPAPERS.length} wallpaper(s), ${window.CATEGORIES.length} categor(ies) from Supabase.`);

    const settings = window.AP_SETTINGS;
    if(settings.heroImage){
      const heroBg = document.querySelector(".hero-bg");
      if(heroBg) heroBg.style.backgroundImage = `url('${settings.heroImage}')`;
    }
    apApplySettingsToDOMFromSupabase(settings);
  }catch(err){
    console.error("sbApplyToPage failed unexpectedly:", err);
    window.WALLPAPERS = window.WALLPAPERS || [];
    window.CATEGORIES = window.CATEGORIES || [];
  }
}

function apApplySettingsToDOMFromSupabase(s){
  if(!s) return;
  if(s.heroEyebrow) document.querySelectorAll(".eyebrow").forEach(el => el.textContent = s.heroEyebrow);
  if(s.heroH1Line1) document.querySelectorAll(".hero-h1-line1").forEach(el => el.textContent = s.heroH1Line1);
  if(s.heroH1Line2) document.querySelectorAll(".hero-h1-line2").forEach(el => el.textContent = s.heroH1Line2);
  if(s.heroSubtitle) document.querySelectorAll(".hero-subtitle").forEach(el => el.textContent = s.heroSubtitle);
  if(s.btn1Text) document.querySelectorAll(".hero-btn1").forEach(el => el.textContent = s.btn1Text);
  if(s.btn2Text) document.querySelectorAll(".hero-btn2").forEach(el => el.textContent = s.btn2Text);
  if(s.instagram) document.querySelectorAll(".social-insta").forEach(a => a.href = s.instagram);
  if(s.twitter) document.querySelectorAll(".social-twitter").forEach(a => a.href = s.twitter);
  if(s.pinterest) document.querySelectorAll(".social-pinterest").forEach(a => a.href = s.pinterest);
  if(s.aboutH2) document.querySelectorAll(".about-h2").forEach(el => el.textContent = s.aboutH2);
  if(s.aboutP1) document.querySelectorAll(".about-p1").forEach(el => el.textContent = s.aboutP1);
  if(s.aboutP2) document.querySelectorAll(".about-p2").forEach(el => el.textContent = s.aboutP2);
}
