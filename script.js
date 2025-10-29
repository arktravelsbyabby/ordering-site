/* Ordering prototype v4 – Google Sheets live integration
   - Date must be at least 2 days from today
   - Global daily total limit enforced via Google Sheets
   - Each dish has its own daily limit enforced via Google Sheets
   - Uses EmailJS for notifications
*/

// ----------------- Configuration -----------------
const soldOutDates = ["2025-10-30", "2025-11-01"]; 
const DAILY_GLOBAL_LIMIT = 20;

const EMAILJS_SERVICE_ID = "service_s3wa5uh";
const EMAILJS_TEMPLATE_ID = "template_loeevn8";
const EMAILJS_PUBLIC_KEY = "WiUVr4jNMTM5mLk2F";
const BUSINESS_EMAIL = "arktravelsbyabby@gmail.com";
const SMS_GATEWAY = "3464908604@vtext.com"; 

// Your deployed Google Sheets Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzc08qe9vnMM5x0kUSHpWIdL-ooxXdfW2NXPGGFTzrJuNJlJWVaJ6pQ29L8emuIPrTk/exec";

// ----------------- Dishes -----------------
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
function todayPlusDays(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

// ----------------- UI Elements -----------------
const orderDateInput = document.getElementById("orderDate");
const dateMessage = document.getElementById("dateMessage");
const menuList = document.getElementById("menuList");
const overallMessage = document.getElementById("overallMessage");
const cartSummary = document.getElementById("cartSummary");
const orderForm = document.getElementById("orderForm");

let selectedDate = null;
let cart = {}; 

// init
orderDateInput.min = todayPlusDays(2);
orderDateInput.value = todayPlusDays(2);
renderMenu();
handleDateChange();
if(window.emailjs && EMAILJS_PUBLIC_KEY) emailjs.init(EMAILJS_PUBLIC_KEY);

// ----------------- Render Menu -----------------
function renderMenu(){
  menuList.innerHTML = "";
  DISHES.forEach(dish=>{
    const wrapper = document.createElement("div");
    wrapper.className = "item";
    wrapper.innerHTML = `
      <div style="display:flex; gap:15px; align-items:flex-start;">
        <div class="item-info">
          <h4>${dish.name} — $${dish.price}</h4>
          <p>${dish.desc}</p>
          <p class="muted">Daily limit: ${dish.limit}</p>
          <div class="qty-controls">
            <button data-action="dec" data-id="${dish.id}">−</button>
            <input type="number" min="0" value="0" data-id="${dish.id}" style="width:50px;" />
            <button data-action="inc" data-id="${dish.id}">+</button>
          </div>
        </div>
      </div>
    `;
    menuList.appendChild(wrapper);

    // buttons
    wrapper.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const input = wrapper.querySelector('input[data-id="'+id+'"]');
        let val = parseInt(input.value||"0",10);
        val = action==="inc" ? val+1 : Math.max(0,val-1);
        input.value = val;
        updateCartItem(id,val);
      });
    });

    // input
    wrapper.querySelector('input[type="number"]').addEventListener("input",(e)=>{
      const id = e.target.dataset.id;
      let v = parseInt(e.target.value||"0",10);
      if(isNaN(v)||v<0)v=0;
      e.target.value=v;
      updateCartItem(id,v);
    });
  });
  renderCart();
}

function updateCartItem(id,qty){
  cart[id]=qty;
  renderCart();
}

function renderCart(){
  const lines=[]; let total=0;
  for(const id in cart){
    const qty=cart[id];
    if(qty>0){
      const dish=DISHES.find(d=>d.id===id);
      lines.push(`<div>${dish.name} × ${qty} — $${(dish.price*qty).toFixed(2)}</div>`);
      total += dish.price*qty;
    }
  }
  cartSummary.innerHTML = lines.length? lines.join("") + `<hr/><strong>Total: $${total.toFixed(2)}</strong>` : `<p class="muted">No items selected</p>`;
}

// ----------------- Date Handling -----------------
orderDateInput.addEventListener("change", handleDateChange);
function handleDateChange(){
  const val=orderDateInput.value;
  selectedDate=val;
  const minAllowed=todayPlusDays(2);
  if(!val || val<minAllowed){ dateMessage.textContent="2 day notice required."; disableMenu(true); return; }
  if(soldOutDates.includes(val)){ dateMessage.textContent="This day is SOLD OUT."; disableMenu(true); return; }
  dateMessage.textContent="";
  disableMenu(false);
}

function disableMenu(dis){
  document.querySelectorAll('#menuList input, #menuList button').forEach(el=>el.disabled=dis);
  if(dis){ cart={}; document.querySelectorAll('#menuList input').forEach(i=>i.value=0); renderCart(); }
}

// ----------------- Submit Order -----------------
orderForm.addEventListener("submit", async function(e){
  e.preventDefault();
  if(!selectedDate){ alert("Please select a valid date."); return; }

  const items=[];
  let totalQty=0;
  for(const id in cart){
    const qty=parseInt(cart[id]||0,10);
    if(qty>0){
      const dish=DISHES.find(d=>d.id===id);
      items.push({id:dish.id,name:dish.name,qty,price:dish.price,subtotal:dish.price*qty});
      totalQty += qty;
    }
  }
  if(items.length===0){ alert("Select at least one item."); return; }

  // POST to Google Sheets Web App
  try{
    const response=await fetch(WEB_APP_URL,{
      method:"POST",
      mode:"cors",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ date:selectedDate, cart: Object.fromEntries(items.map(i=>[i.id,i.qty])) })
    });
    const data=await response.json();
    if(!data.success){ alert("❌ "+data.message); return; }

    // Send notifications via EmailJS
    if(window.emailjs){
      const messageLines=[
        `New order from website`,
        `Date: ${selectedDate}`,
        ...items.map(i=>`${i.name} × ${i.qty} — $${i.subtotal.toFixed(2)}`),
        `Total: $${items.reduce((s,i)=>s+i.subtotal,0)}`
      ];
      const message=messageLines.join("\n");
      await emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{message,email:BUSINESS_EMAIL},EMAILJS_PUBLIC_KEY);
      await emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{message,email:SMS_GATEWAY},EMAILJS_PUBLIC_KEY);
      alert("✅ Order submitted successfully! Emails and SMS sent.");
    }else{ alert("⚠️ EmailJS not loaded. Order saved on Google Sheets only."); }

    // Reset form
    cart={};
    document.querySelectorAll('#menuList input').forEach(inp=>inp.value=0);
    renderCart();
    orderForm.reset();
    orderDateInput.value=selectedDate;
    handleDateChange();

  }catch(err){
    console.error("Order submission failed:",err);
    alert("❌ Failed to submit order. Check console for details.");
  }
});
