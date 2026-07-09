// ═══════════════════════════════════════════════════════════
// AetherPixels — User Account Client
// Handles visitor registration/login/logout/password-reset and
// the features that require a logged-in user: favorites and
// collections. Completely separate from the admin auth in
// admin.html — a regular user account has NO admin privileges;
// admin access is still gated by the admin_users allow-list.
// ═══════════════════════════════════════════════════════════

let currentUser = null;

async function userGetSession(){
  const sb = sbClient();
  if(!sb) return null;
  const { data } = await sb.auth.getSession();
  currentUser = data.session?.user || null;
  return currentUser;
}

async function userSignUp(email, password){
  const sb = sbClient();
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error) throw error;
  return data;
}

async function userSignIn(email, password){
  const sb = sbClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) throw error;
  currentUser = data.user;
  return data;
}

async function userSignOut(){
  const sb = sbClient();
  await sb.auth.signOut();
  currentUser = null;
}

async function userResetPassword(email){
  const sb = sbClient();
  const redirectTo = new URL("account.html", window.location.href).toString();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if(error) throw error;
}

async function userUpdatePassword(newPassword){
  const sb = sbClient();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if(error) throw error;
}

// ─── FAVORITES ────────────────────────────────────────────────
async function favAdd(wallpaperId){
  const sb = sbClient();
  if(!currentUser) throw new Error("Please sign in to save favorites.");
  const { error } = await sb.from("favorites").insert({ user_id: currentUser.id, wallpaper_id: wallpaperId });
  if(error && error.code !== "23505") throw error; // 23505 = already favorited, ignore
}

async function favRemove(wallpaperId){
  const sb = sbClient();
  if(!currentUser) return;
  const { error } = await sb.from("favorites").delete().eq("user_id", currentUser.id).eq("wallpaper_id", wallpaperId);
  if(error) throw error;
}

async function favList(){
  const sb = sbClient();
  if(!currentUser) return [];
  const { data, error } = await sb.from("favorites").select("wallpaper_id").eq("user_id", currentUser.id);
  if(error){ console.error("favList:", error.message); return []; }
  return data.map(r => r.wallpaper_id);
}

async function favIsFavorited(wallpaperId){
  const ids = await favList();
  return ids.includes(wallpaperId);
}

// ─── COLLECTIONS ──────────────────────────────────────────────
async function collectionCreate(name){
  const sb = sbClient();
  if(!currentUser) throw new Error("Please sign in to create a collection.");
  const { data, error } = await sb.from("collections").insert({ user_id: currentUser.id, name }).select().single();
  if(error) throw error;
  return data;
}

async function collectionList(){
  const sb = sbClient();
  if(!currentUser) return [];
  const { data, error } = await sb.from("collections").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });
  if(error){ console.error("collectionList:", error.message); return []; }
  return data;
}

async function collectionDelete(id){
  const sb = sbClient();
  const { error } = await sb.from("collections").delete().eq("id", id);
  if(error) throw error;
}

async function collectionAddItem(collectionId, wallpaperId){
  const sb = sbClient();
  const { error } = await sb.from("collection_items").insert({ collection_id: collectionId, wallpaper_id: wallpaperId });
  if(error && error.code !== "23505") throw error;
}

async function collectionRemoveItem(collectionId, wallpaperId){
  const sb = sbClient();
  const { error } = await sb.from("collection_items").delete().eq("collection_id", collectionId).eq("wallpaper_id", wallpaperId);
  if(error) throw error;
}

async function collectionGetItems(collectionId){
  const sb = sbClient();
  const { data, error } = await sb.from("collection_items").select("wallpaper_id").eq("collection_id", collectionId);
  if(error){ console.error("collectionGetItems:", error.message); return []; }
  return data.map(r => r.wallpaper_id);
}

// ─── TRENDING ─────────────────────────────────────────────────
// timeframe: "today" (24h) | "week" (7d) | "month" (30d)
async function fetchTrending(timeframe = "week", limit = 12){
  const sb = sbClient();
  const hours = timeframe === "today" ? 24 : timeframe === "month" ? 720 : 168;
  const { data, error } = await sb.rpc("get_trending_wallpapers", { window_hours: hours, result_limit: limit });
  if(error){ console.error("fetchTrending:", error.message); return []; }

  const allWallpapers = window.WALLPAPERS || [];
  return data
    .map(row => allWallpapers.find(w => w.id === row.wallpaper_id))
    .filter(Boolean);
}
