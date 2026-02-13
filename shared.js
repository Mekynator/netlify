import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(window.__SUPABASE_URL__, window.__SUPABASE_ANON_KEY__);

export const $ = (id) => document.getElementById(id);

export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

export async function requireAuthOrRedirect() {
  const user = await getSessionUser();
  if (!user) window.location.href = "/account.html";
  return user;
}

export function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

export function setActiveNav(path){
  document.querySelectorAll("[data-nav]").forEach(a=>{
    a.classList.toggle("active", a.getAttribute("href") === path);
  });
}
