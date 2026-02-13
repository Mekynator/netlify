import { supabase, $, requireAuthOrRedirect, setActiveNav } from "./shared.js";
setActiveNav("/custom.html");

$("btnSubmit").onclick = async () => {
  $("msg").textContent = "";

  const user = await requireAuthOrRedirect();
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

  $("msg").textContent = error ? "❌ " + error.message : "✅ Submitted. Go to Account → My Orders.";
};
