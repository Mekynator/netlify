import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL  = window.__SUPABASE_URL__;
const SUPABASE_ANON = window.__SUPABASE_ANON_KEY__;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const $ = (id) => document.getElementById(id);

let currentCategory = "";
let currentQuery = "";

function openModal(id){ $(id).style.display = "flex"; }
function closeModal(id){ $(id).style.display = "none"; }

function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function cardHTML(p){
  const img = p.image_url ? `<img src="${p.image_url}" alt="">` : "";
  return `
  <article class="cardP">
    <div class="img">${img}</div>
    <div class="body">
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="sub">${escapeHtml(p.subtitle || "")}</div>
      <div class="price">From ${(p.price_from_dkk||0).toLocaleString("da-DK")} kr</div>
      <div class="row">
        <button class="primary btn" data-buy="${p.id}">Order</button>
      </div>
    </div>
  </article>`;
}

async function requireAuth(){
  const { data } = await supabase.auth.getSession();
  if (!data.session){
    openModal("modal");
    return null;
  }
  return data.session.user;
}

async function loadProducts(){
  const sort = $("sort").value;

  let q = supabase.from("products").select("*").eq("active", true);

  if (currentCategory) q = q.eq("category", currentCategory);

  if (currentQuery){
    // simple search over title/subtitle
    q = q.or(`title.ilike.%${currentQuery}%,subtitle.ilike.%${currentQuery}%`);
  }

  if (sort === "price_low") q = q.order("price_from_dkk", { ascending: true });
  else if (sort === "price_high") q = q.order("price_from_dkk", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error){
    $("count").textContent = "Error loading products";
    return;
  }

  $("count").textContent = `${data.length} items`;
  $("grid").innerHTML = data.map(cardHTML).join("");
}

async function placeCatalogOrder(productId){
  const user = await requireAuth();
  if (!user) return;

  const { error } = await supabase.from("orders").insert({
    user_id: user.id,
    product_id: productId,
    order_type: "catalog",
    material: "Resin",
    notes: "Catalog order",
    status: "New"
  });

  if (error) alert("Order failed: " + error.message);
  else {
    openModal("ordersModal");
    await loadOrders();
  }
}

async function placeCustomOrder(){
  const user = await requireAuth();
  if (!user) return;

  const material = $("mat").value;
  const size_mm = Number($("size").value || 0) || null;
  const stl_url = $("stl").value.trim();
  const notes = $("notes").value.trim();

  const { error } = await supabase.from("orders").insert({
    user_id: user.id,
    order_type: "custom",
    material,
    size_mm,
    stl_url,
    notes,
    status: "New"
  });

  if (error){
    $("customMsg").textContent = "❌ " + error.message;
    return;
  }

  $("customMsg").textContent = "✅ Custom order submitted. Check My Orders.";
  $("stl").value = "";
  $("notes").value = "";

  openModal("ordersModal");
  await loadOrders();
}

async function loadOrders(){
  const user = await requireAuth();
  if (!user) return;

  const { data, error } = await supabase
    .from("orders")
    .select("*, products(title)")
    .order("created_at", { ascending: false });

  if (error){
    $("ordersList").innerHTML = `<div class="muted">Error: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data.length){
    $("ordersList").innerHTML = `<div class="muted">No orders yet.</div>`;
    return;
  }

  $("ordersList").innerHTML = data.map(o => `
    <div class="order">
      <div>
        <div style="font-weight:900">${escapeHtml(o.products?.title || (o.order_type === "custom" ? "Custom order" : "Order"))}</div>
        <div class="muted" style="margin-top:4px">
          ${escapeHtml(o.material || "")}${o.size_mm ? " • " + o.size_mm + "mm" : ""} • ${escapeHtml(o.created_at)}
        </div>
        ${o.notes ? `<div class="muted" style="margin-top:6px">${escapeHtml(o.notes)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <span class="badge">${escapeHtml(o.status)}</span>
      </div>
    </div>
  `).join("");
}

function setActiveTab(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $("tab-login").classList.toggle("hidden", tab !== "login");
  $("tab-register").classList.toggle("hidden", tab !== "register");
}

async function doLogin(){
  $("loginMsg").textContent = "";
  const email = $("loginEmail").value.trim();
  const password = $("loginPass").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) $("loginMsg").textContent = "❌ " + error.message;
  else {
    $("loginMsg").textContent = "✅ Logged in";
    closeModal("modal");
  }
}

async function doRegister(){
  $("regMsg").textContent = "";
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPass").value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) $("regMsg").textContent = "❌ " + error.message;
  else {
    $("regMsg").textContent = "✅ Account created. You can login now.";
    setActiveTab("login");
  }
}

// EVENTS
document.addEventListener("click", async (e) => {
  const buy = e.target?.getAttribute?.("data-buy");
  if (buy) await placeCatalogOrder(buy);
});

$("btnSearch").onclick = () => { currentQuery = $("q").value.trim(); loadProducts(); };
$("sort").onchange = loadProducts;

$("btnAccount").onclick = () => openModal("modal");
$("closeModal").onclick = () => closeModal("modal");

$("btnMyOrders").onclick = async () => { openModal("ordersModal"); await loadOrders(); };
$("closeOrders").onclick = () => closeModal("ordersModal");

$("btnSubmitCustom").onclick = placeCustomOrder;

document.querySelectorAll(".tab").forEach(b => b.onclick = () => setActiveTab(b.dataset.tab));
$("btnLogin").onclick = doLogin;
$("btnRegister").onclick = doRegister;

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.onclick = () => { currentCategory = btn.dataset.filter || ""; loadProducts(); };
});

$("goQuote").onclick = (e) => { e.preventDefault(); alert("Quote tool is coming next."); };
$("goBulk").onclick = (e) => { e.preventDefault(); alert("Business portal is coming next."); };

loadProducts();
