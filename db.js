// AetherPixels DB utility
// IndexedDB → images/blobs   |   localStorage → settings/metadata

const AP_DB_NAME    = "aetherpixels";
const AP_DB_VERSION = 1;
const AP_STORE      = "images";

let _db = null;

function apOpenDB(){
  return new Promise((resolve, reject) => {
    if(_db){ resolve(_db); return; }
    const req = indexedDB.open(AP_DB_NAME, AP_DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(AP_STORE);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function apSaveImage(key, blob){
  const db = await apOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AP_STORE, "readwrite");
    tx.objectStore(AP_STORE).put(blob, key);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function apGetImage(key){
  try {
    const db = await apOpenDB();
    return new Promise((resolve) => {
      const req = db.transaction(AP_STORE).objectStore(AP_STORE).get(key);
      req.onsuccess = e => {
        const blob = e.target.result;
        resolve(blob ? URL.createObjectURL(blob) : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch(e){ return null; }
}

async function apDeleteImage(key){
  const db = await apOpenDB();
  return new Promise((resolve) => {
    const tx = db.transaction(AP_STORE, "readwrite");
    tx.objectStore(AP_STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror    = resolve;
  });
}

// localStorage helpers
function apSaveSettings(key, val){
  try { localStorage.setItem("ap_" + key, JSON.stringify(val)); } catch(e){}
}
function apGetSettings(key, fallback){
  try {
    const raw = localStorage.getItem("ap_" + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch(e){ return fallback; }
}

// Resolve an image field: if it starts with "db:", load from IndexedDB; else return as-is
async function apResolveImg(src){
  if(typeof src === "string" && src.startsWith("db:")){
    const key = src.slice(3);
    const url = await apGetImage(key);
    return url || "";
  }
  return src || "";
}

// Merge admin overrides into WALLPAPERS and CATEGORIES global arrays
async function apApplyOverrides(){
  try{
    const storedWP  = apGetSettings("wallpapers", null);
    const storedCAT = apGetSettings("categories", null);
    const storedSet = apGetSettings("siteSettings", {});

    if(Array.isArray(storedWP)  && storedWP.length)  window.WALLPAPERS = storedWP;
    if(Array.isArray(storedCAT) && storedCAT.length) window.CATEGORIES = storedCAT;
    if(storedSet) window.AP_SETTINGS = storedSet;

    // Safety net: if globals are still missing for any reason, don't crash the page
    if(!Array.isArray(window.WALLPAPERS))  window.WALLPAPERS = [];
    if(!Array.isArray(window.CATEGORIES))  window.CATEGORIES = [];

    // Resolve db: images to object URLs
    for(const w of window.WALLPAPERS){
      try{
        w._resolvedImg = (typeof w.img === "string" && w.img.startsWith("db:"))
          ? (await apGetImage(w.img.slice(3))) || w.img
          : w.img;
      }catch(e){ w._resolvedImg = w.img; }
    }
    for(const c of window.CATEGORIES){
      try{
        c._resolvedImg = (typeof c.img === "string" && c.img.startsWith("db:"))
          ? (await apGetImage(c.img.slice(3))) || c.img
          : c.img;
      }catch(e){ c._resolvedImg = c.img; }
    }

    // Apply hero image override
    try{
      const heroOverride = await apGetImage("hero_upload");
      if(heroOverride){
        const heroBg = document.querySelector(".hero-bg");
        if(heroBg) heroBg.style.backgroundImage = `url('${heroOverride}')`;
      }
    }catch(e){ /* no hero override, ignore */ }

    // Apply site settings overrides to DOM
    apApplySettingsToDOM(storedSet);
  }catch(err){
    console.error("apApplyOverrides failed, falling back to defaults:", err);
    // Ensure globals exist even after a failure so render calls still work
    if(!Array.isArray(window.WALLPAPERS))  window.WALLPAPERS = window.WALLPAPERS || [];
    if(!Array.isArray(window.CATEGORIES))  window.CATEGORIES = window.CATEGORIES || [];
  }
}

function apApplySettingsToDOM(s){
  if(!s) return;
  if(s.siteName){
    document.querySelectorAll(".brand-name").forEach(el => el.textContent = s.siteName);
  }
  if(s.heroEyebrow){
    const el = document.querySelector(".eyebrow");
    if(el) el.textContent = s.heroEyebrow;
  }
  if(s.heroH1Line1){
    const el = document.querySelector(".hero-h1-line1");
    if(el) el.textContent = s.heroH1Line1;
  }
  if(s.heroH1Line2){
    const el = document.querySelector(".hero-h1-line2");
    if(el) el.textContent = s.heroH1Line2;
  }
  if(s.heroSubtitle){
    const el = document.querySelector(".hero-subtitle");
    if(el) el.textContent = s.heroSubtitle;
  }
  if(s.btn1Text){
    const el = document.querySelector(".hero-btn1");
    if(el) el.textContent = s.btn1Text;
  }
  if(s.btn2Text){
    const el = document.querySelector(".hero-btn2");
    if(el) el.textContent = s.btn2Text;
  }
  if(s.instagram){
    document.querySelectorAll(".social-insta").forEach(a => a.href = s.instagram);
  }
  if(s.twitter){
    document.querySelectorAll(".social-twitter").forEach(a => a.href = s.twitter);
  }
  if(s.pinterest){
    document.querySelectorAll(".social-pinterest").forEach(a => a.href = s.pinterest);
  }
  if(s.aboutH2){
    const el = document.querySelector(".about-h2");
    if(el) el.textContent = s.aboutH2;
  }
  if(s.aboutP1){
    const el = document.querySelector(".about-p1");
    if(el) el.textContent = s.aboutP1;
  }
  if(s.aboutP2){
    const el = document.querySelector(".about-p2");
    if(el) el.textContent = s.aboutP2;
  }
}
