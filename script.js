// Mobile nav toggle
function initNav(){
  const toggle = document.querySelector(".nav-toggle");
  const links  = document.querySelector(".nav-links");
  const nav    = document.querySelector(".nav");

  // inject backdrop
  let backdrop = document.querySelector(".nav-backdrop");
  if(!backdrop){
    backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.prepend(backdrop);
  }

  function openMenu(){
    links.classList.add("open");
    backdrop.classList.add("show");
    nav.classList.add("menu-open");
    document.body.style.overflow = "hidden";
    toggle.innerHTML = "✕";
    toggle.style.fontSize = "18px";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
  }
  function closeMenu(){
    links.classList.remove("open");
    backdrop.classList.remove("show");
    nav.classList.remove("menu-open");
    document.body.style.overflow = "";
    toggle.innerHTML = "☰";
    toggle.style.fontSize = "24px";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  if(toggle && links){
    toggle.addEventListener("click", () => links.classList.contains("open") ? closeMenu() : openMenu());
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
    backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && links.classList.contains("open")) closeMenu();
    });
  }
}

// ---------- Search ----------
function initSearch(){
  const btn = document.querySelector('.icon-btn[aria-label="Open search"]') || document.querySelector('.icon-btn[aria-label="Search"]');
  const navInner = document.querySelector(".nav-inner");
  if(!btn || !navInner) return;

  const box = document.createElement("div");
  box.className = "search-box";
  box.setAttribute("role", "search");
  box.innerHTML = `
    <label for="global-search" class="sr-only">Search wallpapers</label>
    <input type="text" id="global-search" placeholder="Search wallpapers... (press Enter)" autocomplete="off">
  `;
  navInner.appendChild(box);
  const input = box.querySelector("input");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    box.classList.toggle("open");
    btn.setAttribute("aria-expanded", box.classList.contains("open") ? "true" : "false");
    if(box.classList.contains("open")) input.focus();
  });
  btn.setAttribute("aria-expanded", "false");

  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && input.value.trim()){
      window.location.href = "category.html?cat=all&q=" + encodeURIComponent(input.value.trim());
    }
    if(e.key === "Escape"){
      box.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if(!box.contains(e.target) && e.target !== btn){
      box.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

// ---------- Toast ----------
// Uses an ARIA live region so screen readers announce status messages
// (e.g. "Downloaded...", "Message sent...") without moving focus.
function showToast(msg){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ---------- Real image download (fetch -> canvas -> blob) ----------
// Resizes/crops to the chosen device target so it behaves like a real wallpaper download,
// then forces an actual file save instead of opening a new tab.
async function downloadAs(url, title, mode){
  showToast("Preparing your download…");
  const targetW = mode === "mobile" ? 1080 : 1920;
  const targetH = mode === "mobile" ? 1920 : 1080;

  try{
    const img = await loadImageCORS(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    // cover-fit crop, same behaviour as object-fit:cover
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (targetW - w) / 2;
    const y = (targetH - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    canvas.toBlob((blob) => {
      if(!blob){ fallbackOpen(url); return; }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${slugify(title)}-${mode}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      showToast(`Downloaded "${title}" for ${mode === "mobile" ? "Mobile 📱" : "Desktop 🖥️"}`);
    }, "image/jpeg", 0.92);
  }catch(err){
    console.error("Download failed, falling back to opening the image:", err);
    fallbackOpen(url);
  }
}

function loadImageCORS(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only remote http(s) images need crossOrigin for canvas access.
    // blob: and data: URLs (admin-uploaded images) must NOT have it set,
    // or the browser silently fails to load them.
    if(/^https?:\/\//i.test(url)){
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function fallbackOpen(url){
  showToast("Couldn't auto-download — opening image, save it manually");
  window.open(url, "_blank", "noopener");
}

function slugify(s){
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- Download picker modal (Mobile / Desktop) ----------
function openDownloadModal(id){
  const list = window.WALLPAPERS || [];
  const w = list.find(x => x.id === id);
  if(!w) return;

  let modal = document.querySelector(".dl-modal");
  if(modal) modal.remove();

  modal = document.createElement("div");
  modal.className = "dl-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `Download options for ${w.title}`);
  modal.innerHTML = `
    <div class="dl-modal-card">
      <button class="dl-close" aria-label="Close dialog">✕</button>
      <img class="dl-modal-thumb" src="${w._resolvedImg || w.img}" alt="${w.title}">
      <h3>Download "${w.title}"</h3>
      <p>Choose a size to download the right fit.</p>
      <div class="dl-options">
        <button class="dl-option" data-mode="mobile" aria-label="Download for mobile, 1080 by 1920">
          <span class="dl-option-icon" aria-hidden="true">📱</span>
          <span>Mobile</span>
          <span class="dl-option-dim">1080 × 1920</span>
        </button>
        <button class="dl-option" data-mode="desktop" aria-label="Download for desktop, 1920 by 1080">
          <span class="dl-option-icon" aria-hidden="true">🖥️</span>
          <span>Desktop</span>
          <span class="dl-option-dim">1920 × 1080</span>
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add("show"));

  const close = () => { modal.classList.remove("show"); setTimeout(() => modal.remove(), 250); };
  modal.querySelector(".dl-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if(e.target === modal) close(); });
  modal.addEventListener("keydown", (e) => { if(e.key === "Escape") close(); });
  modal.querySelectorAll(".dl-option").forEach(btn => {
    btn.addEventListener("click", () => {
      downloadAs(w._resolvedImg || w.img, w.title, btn.dataset.mode);
      if(typeof sbConfigured === "function" && sbConfigured()){
        sbTrackDownload(w.id, btn.dataset.mode).catch(()=>{});
      }
      close();
    });
  });

  // basic focus trap: focus first option
  modal.querySelector(".dl-option")?.focus();
}

// ---------- Render category cards ----------
function renderCategoryGrid(targetSelector, categories){
  const el = document.querySelector(targetSelector);
  if(!el) return;
  if(!categories || categories.length === 0){
    el.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">Categories are loading or none are available yet. If this persists, check the browser console for errors.</p>`;
    return;
  }
  const cards = categories.map(c => {
    try{
      const name = c.name || "Category";
      const icon = c.icon || "🖼️";
      const img = c._resolvedImg || c.img || "";
      if(!img) return "";
      return `
        <a class="cat-card" href="category.html?cat=${c.id}" role="listitem" aria-label="Browse ${name} wallpapers">
          <img src="${img}" alt="${name} wallpapers preview" loading="lazy" decoding="async" width="400" height="533">
          <div class="cat-info">
            <div class="cat-name"><span aria-hidden="true">${icon}</span> ${name}</div>
            <div class="cat-tags">
              <span>📱 Mobile</span>
              <span>🖥️ Desktop</span>
            </div>
          </div>
        </a>
      `;
    }catch(err){
      console.error("Skipped a malformed category record:", c, err);
      return "";
    }
  });
  el.innerHTML = cards.join("") || `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">Categories are loading or none are available yet.</p>`;
}

// ---------- Render wallpaper grid ----------
function renderWallpaperGrid(targetSelector, wallpapers){
  const el = document.querySelector(targetSelector);
  if(!el) return;
  if(!wallpapers || wallpapers.length === 0){
    el.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">No wallpapers found.</p>`;
    return;
  }
  // Build each card independently — if one record is malformed (missing
  // fields, bad category, etc.) it's skipped instead of crashing the
  // entire grid and taking every other wallpaper down with it.
  const cards = wallpapers.map(w => {
    try{
      const title = w.title || "Untitled Wallpaper";
      const category = w.category || "uncategorized";
      const device = w.device || "Desktop";
      const badge = w.badge || "4K";
      const img = w._resolvedImg || w.img || "";
      if(!img) return "";
      return `
        <div class="wp-card" role="listitem">
          <a class="wp-thumb" href="wallpaper.html?id=${w.id}" aria-label="View ${title} wallpaper details">
            <span class="wp-badge" aria-hidden="true">${badge}</span>
            <img src="${img}" alt="${title} — ${capitalize(category)} wallpaper" loading="lazy" decoding="async" width="480" height="640">
          </a>
          <div class="wp-body">
            <a class="wp-title" href="wallpaper.html?id=${w.id}">${title}</a>
            <div class="wp-meta">${capitalize(category)} • ${device}</div>
            <button class="wp-download" onclick="openDownloadModal(${w.id})" aria-label="Download ${title}">⬇ Download</button>
          </div>
        </div>
      `;
    }catch(err){
      console.error("Skipped a malformed wallpaper record:", w, err);
      return "";
    }
  });
  el.innerHTML = cards.join("") || `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">No wallpapers found.</p>`;
}

function capitalize(s){
  if(!s || typeof s !== "string") return "Uncategorized";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initSearch();
});
