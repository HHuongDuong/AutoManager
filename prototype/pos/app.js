const products = [
  { id: 'p1', name: 'Cà phê sữa', price: 25.00 },
  { id: 'p2', name: 'Trà đào', price: 30.00 },
  { id: 'p3', name: 'Bánh mì', price: 20.00 }
];

let cart = [];
const productList = document.getElementById('productList');
const cartItems = document.getElementById('cartItems');
const totalEl = document.getElementById('total');
const queueEl = document.getElementById('queue');
const networkEl = document.getElementById('network');
let online = true;

function renderProducts(filter=''){
  productList.innerHTML='';
  products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).forEach(p=>{
    const div=document.createElement('div');div.className='product';
    div.innerHTML=`<div>${p.name}<div style="font-size:12px;color:#666">${p.price.toFixed(2)}k</div></div>`;
    const btn=document.createElement('button');btn.textContent='Add';btn.onclick=()=>addToCart(p);
    div.appendChild(btn);productList.appendChild(div);
  });
}

function addToCart(p){
  const existing = cart.find(i=>i.product_id===p.id);
  if(existing) existing.quantity++;
  else cart.push({ id:crypto.randomUUID(), product_id:p.id, name:p.name, quantity:1, unit_price:p.price, subtotal:p.price });
  syncCart();
}

function syncCart(){
  cartItems.innerHTML='';
  let total=0;
  cart.forEach(i=>{
    i.subtotal = i.unit_price * i.quantity;
    total += i.subtotal;
    const row=document.createElement('div');row.innerHTML=`${i.name} x${i.quantity} — ${i.subtotal.toFixed(2)}k`;
    cartItems.appendChild(row);
  });
  totalEl.textContent = total.toFixed(2)+'k';
}

function clearCart(){ cart=[]; syncCart(); }

function loadQueue(){
  const q = JSON.parse(localStorage.getItem('ordersQueue') || '[]');
  queueEl.innerHTML='';
  q.forEach(o=>{
    const li=document.createElement('li');li.className='queue-item';li.textContent = `${o.client_id} — ${o.items.length} items — ${o.status}`;
    queueEl.appendChild(li);
  });
}

function createOrder(){
  if(cart.length===0) return alert('Cart empty');
  const q = JSON.parse(localStorage.getItem('ordersQueue') || '[]');
  const order = { client_id: 'c-'+Date.now(), items: cart.slice(), status: online? 'ready-to-send' : 'queued', created_at: new Date().toISOString() };
  q.push(order); localStorage.setItem('ordersQueue', JSON.stringify(q));
  clearCart(); loadQueue();
}

async function syncQueue(){
  if(!online) return alert('Offline — cannot sync');
  const q = JSON.parse(localStorage.getItem('ordersQueue') || '[]');
  if(q.length===0) return alert('Queue empty');
  // simulate sending
  for(const o of q){ o.status='sent'; }
  localStorage.setItem('ordersQueue', JSON.stringify(q));
  loadQueue();
  alert('Synced '+q.length+' orders (simulated)');
}

document.getElementById('createOrder').onclick = createOrder;
document.getElementById('clearCart').onclick = clearCart;
document.getElementById('syncBtn').onclick = syncQueue;
document.getElementById('search').oninput = (e)=>renderProducts(e.target.value);
document.getElementById('toggleOffline').onclick = function(){ online = !online; networkEl.textContent = online? 'Online':'Offline'; networkEl.className = online? 'online':'offline'; };

renderProducts(); syncCart(); loadQueue();
