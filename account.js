import { supabase, $, setActiveNav } from "./shared.js";
setActiveNav("/account.html");

async function refreshStatus(){
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user || null;
  $("status").textContent = user ? `✅ Logged in as ${user.email}` : "Not logged in";
}

$("btnLogin").onclick = async () => {
  $("loginMsg").textContent = "";
  const email = $("loginEmail").value.trim();
  const password = $("loginPass").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  $("loginMsg").textContent = error ? "❌ " + error.message : "✅ Logged in";
  await refreshStatus();
};

$("btnRegister").onclick = async () => {
  $("regMsg").textContent = "";
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPass").value;

  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name } }
  });

  $("regMsg").textContent = error ? "❌ " + error.message : "✅ Account created. Check email if confirmations are ON.";
};

$("btnLogout").onclick = async () => {
  await supabase.auth.signOut();
  await refreshStatus();
};

refreshStatus();
