/* Ordering prototype v4 - Google Sheets backend
 - Date must be at least 2 days from today (2-day notice)
 - Global daily total limit: 20 orders
 - Each dish has its own daily limit (per-dish)
 - soldOutDates array: manual override (edit in code)
 - Sends orders to Google Sheets Web App
 - Also attempts to notify via EmailJS (optional)
*/

// ----------------- Configuration -----------------
const soldOutDates = ["2025-10-30", "2025-11-01"]; // edit manually
const DAILY_GLOBAL_LIMIT = 20;

// Web App URL (new)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwFDQ8Xj9ijCj9C2ilWFgHHxXCkgNpczG8NF4pb3PxoYxz1qUWthBwiqGrFgl0UqqqZ/exec";

const DISHES = [
  { id: "biriyani", name: "Dindugal Chicken Biriyani", price: 14, desc: "Tamil Nadu style Biriyani with seeraga samba rice. Served with Onion Raita.", limit: 5 },
  { id: "idly", name: "Idly and Sambhar (4 nos)", price: 12, desc: "Fluffy white idly - 4 nos and Sambhar", limit: 5 },
  { id: "fishfry", name: "Marina Beach Fish fry", price: 12, desc: "Homemade Pomfret fish fry", limit: 4 },
  { id: "pepperchicken", name: "Pepper Chicken (bone-in)", price: 12, desc: "South Indian style spicy pepper chicken", limit: 4 },
  { id: "fishcurry", name: "Fish Curry", price: 12, desc: "Tangy Pomfret fish curry", limit: 4 },
  { id: "butterchicken", name: "Butter Chicken (boneless)", price: 14, desc: "Buttery, creamy, silky smooth boneless chicken curry.", limit: 4 },
  { id: "paneer", name: "Paneer Butter Masala", price: 12, desc: "Buttery, creamy Paneer curry", limit: 4 },
  { id: "aviyal", name: "Aviyal", price: 11, desc: "A medley of vegetables in coconut & yogurt based gravy", limit: 3 }
];

// ----------------- Helpers -----------------
function todayPlusDays(n){ const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }

// ----------------- UI -----------------
const orderDateInput = document.getElementById("orderDate");
const dateMessage = document.getElementById("dateMessage");
const menuList = document.getElementById("menuList");
const overallMessage = document.getElementById("overallMessage");
const cartSummary = document.getElementById("cartSummary");
const orderForm = document.getElementById("orderForm");

let selectedDate = null;
let cart = {}; // dishId -> qty

// init
orderDateInput.min = todayPlusDays(2);
orderDateInput.value = todayPlusDays(2);
renderMenu();
handleDateChange();

// render menu
function renderMenu(){
  menuList.innerHTML = ""; // clear previous menu
  DISHES.forEach(dish=>{
    const wrapper = document.createElement("div");
    wrapper.className = "item";
    wrapper.innerHTML = `
      <div class="item-content" style="display:flex; gap:15px; align-items:flex-start;">
        <div class="item-image">
          <img src="${dish.img}" alt="${dish.name}" 
               style="width:150px; height:150px; object-fit:cover; border-radius:8px;" />
        </div>
        <div class="item-info">
          <h4>${dish.name} — $${dish.price}</h4>
          <p>${dish.desc}</p>
          <p class="muted">Daily limit: ${dish.limit}</p>
          <div class="qty-controls" style="display:flex; align-items:center; gap:5px; margin-top:5px;">
            <button data-action="dec" data-id="${dish.id}">−</button>
            <input type="number" min="0" value="0" data-id="${dish.id}" style="width:50px;" />
            <button data-action="inc" data-id="${dish.id}">+</button>
          </div>
        </div>
      </div>
    `;
    menuList.appendChild(wrapper);

    // wire buttons
    wrapper.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const input = wrapper.querySelector('input[data-id="'+id+'"]');
        let val = parseInt(input.value||"0",10);
        if (action==="inc") val++; else val = Math.max(0,val-1);
        input.value = val;
        updateCartItem(id,val);
      });
    });

    // wire input
    wrapper.querySelector('input[type="number"]').addEventListener("input", (e)=>{
      const id = e.target.dataset.id;
      let v = parseInt(e.target.value||"0",10);
      if (isNaN(v)||v<0) v=0;
      e.target.value = v;
      updateCartItem(id,v);
    });
  });

  renderCart();
}

function updateCartItem(id, qty){ cart[id]=qty; renderCart(); }

function renderCart(){
  const lines = []; let total=0;
  for(const id in cart){ const qty = cart[id]; if(qty>0){ const dish = DISHES.find(d=>d.id===id); lines.push(`<div>${dish.name} × ${qty} — $${(dish.price*qty).toFixed(2)}</div>`); total += dish.price*qty; } }
  cartSummary.innerHTML = lines.length? lines.join("") + `<hr/><strong>Total: $${total.toFixed(2)}</strong>` : `<p class="muted">No items selected</p>`;
}

// date handling
orderDateInput.addEventListener("change", handleDateChange);
function handleDateChange(){
  const val = orderDateInput.value;
  selectedDate = val;
  const minAllowed = todayPlusDays(2);
  if (!val || val < minAllowed){ dateMessage.textContent = "2 day notice needed for orders — menu deactivated for this date."; disableMenu(true); return; }
  if (soldOutDates.includes(val)){ dateMessage.textContent = "This day is SOLD OUT."; disableMenu(true); return; }
  dateMessage.textContent = "";
  disableMenu(false);
}

function disableMenu(dis){ document.querySelectorAll('#menuList input, #menuList button').forEach(el=> el.disabled = dis); if (dis){ cart={}; document.querySelectorAll('#menuList input').forEach(i=> i.value=0); renderCart(); } }

// ---------------- Submit Order ----------------
orderForm.addEventListener("submit", async function(e){
  e.preventDefault();
  if (!selectedDate){ alert("Please select a valid date."); return; }
  const minAllowed = todayPlusDays(2);
  if (selectedDate < minAllowed){ alert("2 day notice needed for orders"); return; }
  if (soldOutDates.includes(selectedDate)){ alert("Selected date is sold out"); return; }

  const items = []; let totalQty=0;
  for (const id in cart){ const qty = parseInt(cart[id]||0,10); if (qty>0){ const dish = DISHES.find(d=>d.id===id); items.push({ id: dish.id, name: dish.name, qty, price: dish.price, subtotal: dish.price*qty }); totalQty += qty; } }
  if (items.length===0){ alert("Please choose at least one item."); return; }

  // Prepare payload
  const payload = {
    date: selectedDate,
    cart: {}
  };
  items.forEach(it => payload.cart[it.id] = it.qty);

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {"Content-Type": "application/json"}
    });

    const data = await res.json();
    if(data.success){
      alert("✅ Order submitted successfully!");
      cart = {};
      document.querySelectorAll('#menuList input').forEach(inp=> inp.value = 0);
      renderCart();
      orderForm.reset();
      orderDateInput.value = selectedDate;
      handleDateChange();
    } else {
      alert("❌ " + data.message);
    }

  } catch(err){
    console.error("Order submission failed:", err);
    alert("❌ Failed to submit order. Check console for details.");
  }
});
