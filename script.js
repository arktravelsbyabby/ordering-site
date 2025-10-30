/* Ordering prototype v3 (modified)
 - Date must be at least 2 days from today (2-day notice)
 - Daily limit displayed but not enforced
 - Visual per-dish limit on + button
 - soldOutDates array: manual override
 - Sends notification via EmailJS including SMS
*/

// ----------------- Configuration -----------------
const soldOutDates = ["2025-10-30", "2025-11-01"]; // edit manually
const DAILY_GLOBAL_LIMIT = 20; // still used for display only
const BUSINESS_EMAIL = "arktravelsbyabby@gmail.com";
const SMS_GATEWAY = "3464908604@vtext.comcast.net"; // Xfinity mobile email-to-sms

// EmailJS credentials
const EMAILJS_SERVICE_ID = "service_s3wa5uh";
const EMAILJS_TEMPLATE_ID = "template_loeevn8";
const EMAILJS_PUBLIC_KEY = "WiUVr4jNMTM5mLk2F";

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

// init EmailJS
if (window.emailjs && EMAILJS_PUBLIC_KEY) emailjs.init(EMAILJS_PUBLIC_KEY);

// render menu
function renderMenu(){
  menuList.innerHTML = ""; // clear previous menu
  DISHES.forEach(dish=>{
    const wrapper = document.createElement("div");
    wrapper.className = "item";
    wrapper.innerHTML = `
      <div class="item-content" style="display:flex; gap:15px; align-items:flex-start;">
        <div class="item-image">
          <img src="${dish.img || ''}" alt="${dish.name}" 
               style="width:150px; height:150px; object-fit:cover; border-radius:8px;" />
        </div>
        <div class="item-info">
          <h4>${dish.name} — $${dish.price}</h4>
          <p>${dish.desc}</p>
          <p class="muted">Daily limit: ${dish.limit}</p>
          <div class="qty-controls" style="display:flex; align-items:center; gap:5px; margin-top:5px;">
            <button class="dec-btn" data-id="${dish.id}" data-action="dec">−</button>
            <input type="number" min="0" value="0" data-id="${dish.id}" style="width:50px;" />
            <button class="inc-btn" data-id="${dish.id}" data-action="inc">+</button>
          </div>
        </div>
      </div>
    `;
    menuList.appendChild(wrapper);

    const input = wrapper.querySelector('input[type="number"]');
    const incBtn = wrapper.querySelector('button[data-action="inc"]');
    const decBtn = wrapper.querySelector('button[data-action="dec"]');

    // -------------------------------
    // Visual per-dish limit: disable + at limit
    if (input) input.max = dish.limit;

    if (incBtn){
      incBtn.addEventListener("click", ()=>{
        let val = parseInt(input.value||"0",10);
        if (val < dish.limit) val++;
        input.value = val;
        updateCartItem(dish.id,val);
        incBtn.disabled = val >= dish.limit;
      });
    }

    if (decBtn){
      decBtn.addEventListener("click", ()=>{
        let val = parseInt(input.value||"0",10);
        if (val>0) val--;
        input.value = val;
        updateCartItem(dish.id,val);
        incBtn.disabled = parseInt(input.value||"0",10) >= dish.limit;
      });
    }
    // -------------------------------
  });

  renderCart();
}

// update cart
function updateCartItem(id, qty){ cart[id]=qty; renderCart(); }

// render cart
function renderCart(){
  const lines = []; let total=0;
  for(const id in cart){
    const qty = cart[id];
    if(qty>0){
      const dish = DISHES.find(d=>d.id===id);
      lines.push(`<div>${dish.name} × ${qty} — $${(dish.price*qty).toFixed(2)}</div>`);
      total += dish.price*qty;
    }
  }
  cartSummary.innerHTML = lines.length? lines.join("") + `<hr/><strong>Total: $${total.toFixed(2)}</strong>` : `<p class="muted">No items selected</p>`;
}

// date handling
orderDateInput.addEventListener("change", handleDateChange);
function handleDateChange(){
  const val = orderDateInput.value;
  selectedDate = val;
  const minAllowed = todayPlusDays(2);
  if (!val || val < minAllowed){ dateMessage.textContent = "2 day notice needed — menu deactivated."; disableMenu(true); return; }
  if (soldOutDates.includes(val)){ dateMessage.textContent = "This day is SOLD OUT."; disableMenu(true); return; }
  dateMessage.textContent = "";
  disableMenu(false);
}

function disableMenu(dis){ 
  document.querySelectorAll('#menuList input, #menuList button').forEach(el=> el.disabled = dis);
  if (dis){ cart={}; document.querySelectorAll('#menuList input').forEach(i=> i.value=0); renderCart(); }
}

// submit order
orderForm.addEventListener("submit", async function(e){
  e.preventDefault();
  if (!selectedDate){ alert("Please select a valid date."); return; }
  const minAllowed = todayPlusDays(2);
  if (selectedDate < minAllowed){ alert("2 day notice needed"); return; }
  if (soldOutDates.includes(selectedDate)){ alert("Selected date is sold out"); return; }

  const items = []; let totalQty=0;
  for (const id in cart){ const qty = parseInt(cart[id]||0,10); if (qty>0){ const dish = DISHES.find(d=>d.id===id); items.push({ id: dish.id, name: dish.name, qty, price: dish.price, subtotal: dish.price*qty }); totalQty += qty; } }
  if (items.length===0){ alert("Please choose at least one item."); return; }

  // ---------------- LIMIT CHECKS COMMENTED OUT ----------------
  /*
  const counts = getStoredCounts(selectedDate);
  if (counts.total + totalQty > DAILY_GLOBAL_LIMIT){ alert("This order would exceed today's overall capacity."); return; }
  for (const it of items){
    const dishObj = DISHES.find(d=>d.id===it.id);
    if (counts.perDish[dishObj.id] + it.qty > dishObj.limit){
      alert(`The dish ${it.name} doesn't have enough remaining quantity for the selected date.`);
      return;
    }
  }
  */
  // -------------------------------------------------------------

  // customer details
  const name = document.getElementById("custName").value;
  const email = document.getElementById("custEmail").value;
  const phone = document.getElementById("custPhone").value;

  const totalPrice = items.reduce((s,i)=> s + i.subtotal, 0);
  const lines = [
    "New order from website",
    "Name: " + name,
    "Email: " + email,
    "Phone: " + phone,
    "Date: " + selectedDate,
    "Items:"
  ];
  items.forEach(it=> lines.push(it.name + " × " + it.qty + " — $" + it.subtotal.toFixed(2)));
  lines.push("Total: $" + totalPrice.toFixed(2));
  const orderText = lines.join("\n");

  try {
    if (window.emailjs) {
      // Email
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { message: orderText, email: BUSINESS_EMAIL },
        EMAILJS_PUBLIC_KEY
      );
      // SMS
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { message: orderText, email: SMS_GATEWAY },
        EMAILJS_PUBLIC_KEY
      );
      alert("✅ Order submitted — email and SMS notifications sent!");
    } else {
      alert("⚠️ EmailJS not loaded. Order saved locally only.");
    }
  } catch(err){
    console.error("EmailJS error:", err);
    alert("❌ Order saved locally but notification failed. Check console for details.");
  }

  // reset form
  cart = {};
  document.querySelectorAll('#menuList input').forEach(inp=> inp.value=0);
  renderCart();
  orderForm.reset();
  orderDateInput.value = selectedDate;
  handleDateChange();
});
