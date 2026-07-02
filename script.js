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
  }
  function closeMenu(){
    links.classList.remove("open");
    backdrop.classList.remove("show");
    nav.classList.remove("menu-open");
    document.body.style.overflow = "";
    toggle.innerHTML = "☰";
    toggle.style.fontSize = "24px";
  }

  if(toggle && links){
    toggle.addEventListener("click", () => links.classList.contains("open") ? closeMenu() : openMenu());
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
    backdrop.addEventListener("click", closeMenu);
  }
}

// ---------- Search ----------
function initSearch(){
  const btn = document.querySelector('.icon-btn[aria-label="Search"]');
  const navInner = document.querySelector(".nav-inner");
  if(!btn || !navInner) return;

  const box = document.createElement("div");
  box.className = "search-box";
  box.innerHTML = `<input type="text" id="global-search" placeholder="Search wallpapers... (press Enter)">`;
  navInner.appendChild(box);
  const input = box.querySelector("input");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    box.classList.toggle("open");
    if(box.classList.contains("open")) input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && input.value.trim()){
      window.location.href = "category.html?cat=all&q=" + encodeURIComponent(input.value.trim());
    }
  });

  document.addEventListener("click", (e) => {
    if(!box.contains(e.target) && e.target !== btn){
      box.classList.remove("open");
    }
  });
}

// ---------- Toast ----------
function showToast(msg){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
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
    img.crossOrigin = "anonymous";
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
  const w = WALLPAPERS.find(x => x.id === id);
  if(!w) return;

  let modal = document.querySelector(".dl-modal");
  if(modal) modal.remove();

  modal = document.createElement("div");
  modal.className = "dl-modal";
  modal.innerHTML = `
    <div class="dl-modal-card">
      <button class="dl-close" aria-label="Close">✕</button>
      <img class="dl-modal-thumb" src="${w.img}" alt="${w.title}">
      <h3>Download "${w.title}"</h3>
      <p>Choose a size to download the right fit.</p>
      <div class="dl-options">
        <button class="dl-option" data-mode="mobile">
          <span class="dl-option-icon">📱</span>
          <span>Mobile</span>
          <span class="dl-option-dim">1080 × 1920</span>
        </button>
        <button class="dl-option" data-mode="desktop">
          <span class="dl-option-icon">🖥️</span>
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
  modal.querySelectorAll(".dl-option").forEach(btn => {
    btn.addEventListener("click", () => {
      downloadAs(w.img, w.title, btn.dataset.mode);
      close();
    });
  });
}

// ---------- Render category cards ----------
function renderCategoryGrid(targetSelector, categories){
  const el = document.querySelector(targetSelector);
  if(!el) return;
  el.innerHTML = categories.map(c => `
    <a class="cat-card" href="category.html?cat=${c.id}">
      <img src="${c.img}" alt="${c.name} wallpapers" loading="lazy">
      <div class="cat-info">
        <div class="cat-name"><span>${c.icon}</span> ${c.name}</div>
        <div class="cat-tags">
          <span>📱 Mobile</span>
          <span>🖥️ Desktop</span>
        </div>
      </div>
    </a>
  `).join("");
}

// ---------- Render wallpaper grid ----------
// Clicking the image/title opens the full preview page (wallpaper.html).
// The Download button opens the Mobile/Desktop picker directly, for convenience.
function renderWallpaperGrid(targetSelector, wallpapers){
  const el = document.querySelector(targetSelector);
  if(!el) return;
  if(wallpapers.length === 0){
    el.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px 0;">No wallpapers found.</p>`;
    return;
  }
  el.innerHTML = wallpapers.map(w => `
    <div class="wp-card">
      <a class="wp-thumb" href="wallpaper.html?id=${w.id}">
        <span class="wp-badge">${w.badge}</span>
        <img src="${w.img}" alt="${w.title}" loading="lazy">
      </a>
      <div class="wp-body">
        <a class="wp-title" href="wallpaper.html?id=${w.id}">${w.title}</a>
        <div class="wp-meta">${capitalize(w.category)} • ${w.device}</div>
        <button class="wp-download" onclick="openDownloadModal(${w.id})">⬇ Download</button>
      </div>
    </div>
  `).join("");
}

function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initSearch();
});
