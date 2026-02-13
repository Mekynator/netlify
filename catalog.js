import { supabase, $, escapeHtml, requireAuthOrRedirect, setActiveNav } from "./shared.js";

setActiveNav("/catalog.html");

let currentCategory = "";
let currentQuery = "";

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

async function loadProducts(){
  const sort = $("sort").value;

  let q = supabase.from("products").select("*").eq("active", true);

  if (currentCategory) q = q.eq("category", currentCategory);
  if (currentQuery) q = q.or(`title.ilike.%${currentQuery}%,subtitle.ilike.%${currentQuery}%`);

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

async function placeOrder(productId){
  const user = await requireAuthOrRedirect();

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
    await loadOrders();
    $("ordersModal").style.display = "flex";
  }
}

async function loadOrders(){
  const user = await requireAuthOrRedirect();
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
        <div style="font-weight:900">${escapeHtml(o.products?.title || "Order")}</div>
        <div class="muted" style="margin-top:4px">
          ${escapeHtml(o.material||"")} • ${escapeHtml(o.created_at)}
        </div>
      </div>
      <div style="text-align:right"><span class="badge">${escapeHtml(o.status)}</span></div>
    </div>
  `).join("");
}

// events
document.addEventListener("click", async (e) => {
  const buy = e.target?.getAttribute?.("data-buy");
  if (buy) await placeOrder(buy);
});

document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.onclick = () => { currentCategory = btn.dataset.filter || ""; loadProducts(); };
});

$("btnSearch").onclick = () => { currentQuery = $("q").value.trim(); loadProducts(); };
$("sort").onchange = loadProducts;

$("btnMyOrders").onclick = async () => {
  await loadOrders();
  $("ordersModal").style.display = "flex";
};
$("closeOrders").onclick = () => $("ordersModal").style.display = "none";

loadProducts();
