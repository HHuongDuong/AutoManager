const status = document.getElementById('status');
const checkInBtn = document.getElementById('checkIn');
const checkOutBtn = document.getElementById('checkOut');
const shiftSelect = document.getElementById('shiftSelect');
const productList = document.getElementById('productList');
const cartList = document.getElementById('cartList');
const totalEl = document.getElementById('total');
const tableSelect = document.getElementById('tableSelect');
const queueEl = document.getElementById('queue');
const searchEl = document.getElementById('search');
const paymentModal = document.getElementById('paymentModal');
const dueAmount = document.getElementById('dueAmount');
const cashInput = document.getElementById('cashInput');
const changeEl = document.getElementById('change');
let orderType = 'DINE_IN';
let cart = [];
const products = [
  { id:'p1', name:'Cà phê sữa', price:25 },
  { id:'p2', name:'Americano', price:28 },
  { id:'p3', name:'Trà đào', price:30 },
  { id:'p4', name:'Bánh mì', price:20 }
];
const API_BASE_DEFAULT = localStorage.getItem('API_BASE') || 'http://localhost:3000';
const getToken = () => localStorage.getItem('ACCESS_TOKEN');
let onDuty = true;

async function loadMe(){
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  try{
    const res = await fetch(`${API_BASE}/me`, { headers: { 'Authorization': `Bearer ${getToken()}` }});
    if(!res.ok) return;
    const me = await res.json();
    if (me.employee?.id) localStorage.setItem('EMPLOYEE_ID', me.employee.id);
    status.textContent = `On Duty (${me.employee?.full_name || me.user_id.slice(0,6)})`;
  }catch(e){ /* ignore */ }
}

function renderProducts(query=''){
  productList.innerHTML='';
  products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).forEach(p=>{
    const row=document.createElement('div');row.className='product';
    row.innerHTML=`<div>${p.name}<div style="font-size:12px;color:#666">${p.price}k</div></div>`;
    const btn=document.createElement('button');btn.textContent='Add';btn.onclick=()=>addToCart(p);
    row.appendChild(btn);
    productList.appendChild(row);
  });
}

function addToCart(p){
  const item = cart.find(i=>i.id===p.id);
  if(item) item.qty++; else cart.push({ id:p.id, name:p.name, price:p.price, qty:1 });
  renderCart();
}

function renderCart(){
  cartList.innerHTML='';
  let total=0;
  cart.forEach(i=>{
    total += i.price*i.qty;
    const row=document.createElement('div');
    row.className='cart-item';
    row.innerHTML=`${i.name} x${i.qty} — ${(i.price*i.qty).toFixed(2)}k`;
    cartList.appendChild(row);
  });
  totalEl.textContent = total.toFixed(2) + 'k';
}

function loadQueue(){
  const q = JSON.parse(localStorage.getItem('mobileQueue')||'[]');
  queueEl.innerHTML='';
  q.forEach(o=>{ const li=document.createElement('li'); li.textContent=`${o.id} — ${o.status}`; queueEl.appendChild(li); });
}

async function createOrder(){
  if(cart.length===0) return alert('Cart empty');
  if(orderType==='DINE_IN' && !tableSelect.value) return alert('Select table');
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const payload = {
    branch_id: '00000000-0000-0000-0000-000000000000',
    order_type: orderType,
    table_id: orderType==='DINE_IN' ? tableSelect.value || null : null,
    items: cart.map(i=>({ product_id: i.id, name: i.name, quantity: i.qty, unit_price: i.price }))
  };
  try{
    const res = await fetch(`${API_BASE}/orders`,{
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('api_error');
  }catch(e){
    const q = JSON.parse(localStorage.getItem('mobileQueue')||'[]');
    q.push({ id:'o-'+Date.now(), status:'queued', items: cart });
    localStorage.setItem('mobileQueue', JSON.stringify(q));
  }
  cart=[]; renderCart(); loadQueue();
}

async function loadShifts(){
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  try{
    const res = await fetch(`${API_BASE}/shifts`, { headers: { 'Authorization': `Bearer ${getToken()}` }});
    if(!res.ok) return;
    const shifts = await res.json();
    shiftSelect.innerHTML='';
    shifts.forEach(s=>{
      const opt=document.createElement('option');
      opt.value=s.id; opt.textContent=`${s.name} (${s.start_time} - ${s.end_time})`;
      shiftSelect.appendChild(opt);
    });
  }catch(e){ /* ignore */ }
}

checkInBtn.onclick = async () => {
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const shift_id = shiftSelect.value;
  const employee_id = localStorage.getItem('EMPLOYEE_ID');
  if(!employee_id || !shift_id) return alert('Missing employee_id or shift');
  const res = await fetch(`${API_BASE}/attendance/checkin`,{
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
    body: JSON.stringify({ employee_id, shift_id })
  });
  if(res.ok){ onDuty = true; status.textContent='On Duty'; status.style.background='#10b981'; }
};

document.getElementById('holdOrder').onclick = createOrder;
document.getElementById('payOrder').onclick = () => {
  if(cart.length===0) return alert('Cart empty');
  if(orderType==='DINE_IN' && !tableSelect.value) return alert('Select table');
  paymentModal.classList.remove('hidden');
  dueAmount.textContent = totalEl.textContent;
};
document.getElementById('confirmPay').onclick = async () => {
  await createOrder();
  paymentModal.classList.add('hidden');
};
document.getElementById('cancelPay').onclick = () => paymentModal.classList.add('hidden');
cashInput.oninput = () => {
  const due = parseFloat(totalEl.textContent) || 0;
  const cash = parseFloat(cashInput.value) || 0;
  changeEl.textContent = (cash - due).toFixed(2) + 'k';
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
searchEl.oninput = (e)=>renderProducts(e.target.value);
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t=>t.classList.add('hidden'));
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  };
});

checkOutBtn.onclick = async () => {
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const employee_id = localStorage.getItem('EMPLOYEE_ID');
  if(!employee_id) return alert('Missing employee_id');
  const res = await fetch(`${API_BASE}/attendance/checkout`,{
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
    body: JSON.stringify({ employee_id })
  });
  if(res.ok){ onDuty = false; status.textContent='Off Duty'; status.style.background='#6b7280'; }
};

async function login(){
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  const apiBase = document.getElementById('apiBase').value || API_BASE_DEFAULT;
  localStorage.setItem('API_BASE', apiBase);
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const res = await fetch(`${apiBase}/auth/login`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username: user, password: pass })
    });
    if(!res.ok) throw new Error('login_failed');
    const data = await res.json();
    localStorage.setItem('ACCESS_TOKEN', data.access_token);
    document.getElementById('loginModal').classList.add('hidden');
    loadMe();
    loadShifts();
  }catch(e){
    errEl.textContent = 'Login failed';
  }
}

document.getElementById('loginBtn').onclick = login;
document.getElementById('apiBase').value = API_BASE_DEFAULT;
if(getToken()) document.getElementById('loginModal').classList.add('hidden');

loadMe();
loadShifts();
renderProducts();
renderCart();
loadQueue();
