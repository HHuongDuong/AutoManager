const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3000';
const getToken = () => localStorage.getItem('ACCESS_TOKEN');
const categories = ['All','Coffee','Tea','Food'];
const products = [
  { id:'p1', name:'Cà phê sữa', price:25, cat:'Coffee' },
  { id:'p2', name:'Americano', price:28, cat:'Coffee' },
  { id:'p3', name:'Trà đào', price:30, cat:'Tea' },
  { id:'p4', name:'Bánh mì', price:20, cat:'Food' }
];
let cart = [];
let online = true;
let orderType = 'DINE_IN';

const categoriesEl = document.getElementById('categories');
const productGrid = document.getElementById('productGrid');
const cartList = document.getElementById('cartList');
const totalEl = document.getElementById('total');
const queueEl = document.getElementById('queue');
const netStatus = document.getElementById('netStatus');
const paymentModal = document.getElementById('paymentModal');
const dueAmount = document.getElementById('dueAmount');
const cashInput = document.getElementById('cashInput');
const changeEl = document.getElementById('change');
const tableSelect = document.getElementById('tableSelect');

function renderCategories(){
  categoriesEl.innerHTML='';
  categories.forEach((c,i)=>{
    const btn=document.createElement('button');
    btn.textContent=c; if(i===0) btn.classList.add('active');
    btn.onclick=()=>selectCategory(c, btn);
    categoriesEl.appendChild(btn);
  });
}

function selectCategory(cat, btn){
  [...categoriesEl.children].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(cat, document.getElementById('search').value);
}

function renderProducts(cat='All', query=''){
  productGrid.innerHTML='';
  products.filter(p=> (cat==='All'||p.cat===cat) && p.name.toLowerCase().includes(query.toLowerCase()))
    .forEach(p=>{
      const div=document.createElement('div');div.className='product';
      div.innerHTML=`<div>${p.name}<div style="font-size:12px;color:#666">${p.price}k</div></div>`;
      const btn=document.createElement('button');btn.textContent='Add';btn.onclick=()=>addToCart(p);
      div.appendChild(btn);productGrid.appendChild(div);
    });
}

function addToCart(p){
  const item = cart.find(i=>i.id===p.id);
  if(item) item.qty += 1; else cart.push({ id:p.id, name:p.name, price:p.price, qty:1 });
  renderCart();
}

function renderCart(){
  cartList.innerHTML='';
  let total = 0;
  cart.forEach(i=>{
    total += i.price * i.qty;
    const row = document.createElement('div');
    row.className='cart-item';
    row.innerHTML=`<span>${i.name} x${i.qty}</span><span>${(i.price*i.qty).toFixed(2)}k</span>`;
    cartList.appendChild(row);
  });
  totalEl.textContent = total.toFixed(2) + 'k';
}

function loadQueue(){
  const q = JSON.parse(localStorage.getItem('posQueue')||'[]');
  queueEl.innerHTML='';
  q.forEach(o=>{ const li=document.createElement('li'); li.textContent=`${o.id} — ${o.status}`; queueEl.appendChild(li); });
}

async function createQueuedOrder(){
  if(cart.length===0) return alert('Cart empty');
  if(orderType==='DINE_IN' && !tableSelect.value) return alert('Select table');
  const payload = {
    branch_id: '00000000-0000-0000-0000-000000000000',
    order_type: orderType,
    table_id: orderType==='DINE_IN' ? tableSelect.value || null : null,
    items: cart.map(i=>({ product_id: i.id, name: i.name, quantity: i.qty, unit_price: i.price }))
  };
  if(online && getToken()){
    try{
      const res = await fetch(`${API_BASE}/orders`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('api_error');
    }catch(e){
      const q = JSON.parse(localStorage.getItem('posQueue')||'[]');
      q.push({ id: 'o-'+Date.now(), status: 'queued', items: cart });
      localStorage.setItem('posQueue', JSON.stringify(q));
    }
  }else{
    const q = JSON.parse(localStorage.getItem('posQueue')||'[]');
    q.push({ id: 'o-'+Date.now(), status: online?'ready':'queued', items: cart });
    localStorage.setItem('posQueue', JSON.stringify(q));
  }
  cart = []; renderCart(); loadQueue();
}

document.getElementById('payOrder').onclick = ()=>{
  if(cart.length===0) return alert('Cart empty');
  if(orderType==='DINE_IN' && !tableSelect.value) return alert('Select table');
  paymentModal.classList.remove('hidden');
  dueAmount.textContent = totalEl.textContent;
};

document.getElementById('confirmPay').onclick = ()=>{
  createQueuedOrder();
  paymentModal.classList.add('hidden');
};
document.getElementById('cancelPay').onclick = ()=>paymentModal.classList.add('hidden');
document.getElementById('cashInput').oninput = ()=>{
  const due = parseFloat(totalEl.textContent) || 0;
  const cash = parseFloat(cashInput.value) || 0;
  changeEl.textContent = (cash - due).toFixed(2) + 'k';
};

document.getElementById('clearCart').onclick = ()=>{ cart=[]; renderCart(); };
document.getElementById('holdOrder').onclick = ()=>createQueuedOrder();
document.getElementById('syncBtn').onclick = ()=>alert('Sync simulated');
document.getElementById('search').oninput = (e)=>{
  const active = [...categoriesEl.children].find(b=>b.classList.contains('active'))?.textContent || 'All';
  renderProducts(active, e.target.value);
};

document.getElementById('toggleNet').onclick = ()=>{
  online = !online;
  netStatus.textContent = online ? 'Online' : 'Offline';
  netStatus.className = 'status ' + (online ? 'online' : 'offline');
};

document.getElementById('dineIn').onclick = ()=>{
  orderType='DINE_IN';
  document.getElementById('dineIn').classList.add('active');
  document.getElementById('takeaway').classList.remove('active');
};

document.getElementById('takeaway').onclick = ()=>{
  orderType='TAKEAWAY';
  document.getElementById('takeaway').classList.add('active');
  document.getElementById('dineIn').classList.remove('active');
  tableSelect.value='';
};

renderCategories();
renderProducts();
renderCart();
loadQueue();
