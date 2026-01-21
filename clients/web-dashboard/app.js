const API_BASE_DEFAULT = localStorage.getItem('API_BASE') || 'http://localhost:3000';
const getToken = () => localStorage.getItem('ACCESS_TOKEN');

async function fetchJSON(path){
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const res = await fetch(`${API_BASE}${path}`,{ headers: { 'Authorization': `Bearer ${getToken()}` }});
  if(!res.ok) throw new Error('api_error');
  return res.json();
}

async function loadDashboard(){
  try{
    const revenue = await fetchJSON('/reports/revenue');
    const orders = await fetchJSON('/orders');
    const inventory = await fetchJSON('/reports/inventory');
    const attendance = await fetchJSON('/reports/attendance');

    const totalRevenue = revenue.reduce((s,r)=>s+Number(r.revenue||0),0);
    const totalOrders = orders.length;
    const avg = totalOrders ? totalRevenue/totalOrders : 0;

    document.getElementById('kpiRevenue').textContent = totalRevenue.toLocaleString();
    document.getElementById('kpiOrders').textContent = totalOrders;
    document.getElementById('kpiAvg').textContent = Math.round(avg).toLocaleString();

    const salesTable = document.getElementById('salesTable');
    salesTable.innerHTML='';
    orders.slice(0,10).forEach(s => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${s.id||''}</td><td>${s.order_type||''}</td><td>${(s.total_amount||0).toLocaleString()}</td><td>${s.payment_status||''}</td>`;
      salesTable.appendChild(row);
    });

    const invTable = document.getElementById('invTable');
    invTable.innerHTML='';
    inventory.forEach(i => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${i.ingredient_id}</td><td>${i.total_in||0}</td><td>${i.total_out||0}</td><td>${i.total_adjust||0}</td>`;
      invTable.appendChild(row);
    });

    const staffTable = document.getElementById('staffTable');
    staffTable.innerHTML='';
    attendance.forEach(s => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${s.full_name||''}</td><td>Staff</td><td>${Number(s.total_hours||0).toFixed(1)}</td>`;
      staffTable.appendChild(row);
    });

    const audit = await fetchJSON('/audit-logs?limit=50');
    const auditTable = document.getElementById('auditTable');
    auditTable.innerHTML='';
    audit.forEach(a => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${a.created_at||''}</td><td>${a.user_id||''}</td><td>${a.action||''}</td><td>${a.object_type||''}</td>`;
      auditTable.appendChild(row);
    });
  }catch(e){
    console.warn('Using mock data: set ACCESS_TOKEN in localStorage to fetch real data.');
  }
}

async function createVoucher(type){
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const token = getToken();
  const branch_id = prompt('Branch ID');
  const ingredient_id = prompt('Ingredient ID');
  const quantity = Number(prompt('Quantity'));
  const unit_cost = type === 'receipts' ? Number(prompt('Unit cost (optional)')) : null;
  const reason = prompt('Reason (optional)') || null;
  if(!branch_id || !ingredient_id || !quantity) return;
  const payload = {
    branch_id,
    reason,
    items: [{ ingredient_id, quantity, unit_cost }]
  };
  const res = await fetch(`${API_BASE}/inventory/${type}`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify(payload)
  });
  if(!res.ok) alert('Failed');
  else loadDashboard();
}

async function suggestReorder(){
  const API_BASE = localStorage.getItem('API_BASE') || API_BASE_DEFAULT;
  const token = getToken();
  const branch_id = prompt('Branch ID');
  const ingredient_id = prompt('Ingredient ID');
  const on_hand = Number(prompt('On hand quantity'));
  const series = prompt('Series (comma separated, e.g., 5,6,7)') || '';
  if(!branch_id || !ingredient_id) return;
  const payload = {
    branch_id,
    items: [{ ingredient_id, on_hand, series: series.split(',').map(s=>Number(s.trim())).filter(n=>!Number.isNaN(n)) }]
  };
  const res = await fetch(`${API_BASE}/ai/suggest-reorder`,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify(payload)
  });
  if(!res.ok) return alert('Failed');
  const data = await res.json();
  const box = document.getElementById('suggestBox');
  box.style.display = 'block';
  box.innerHTML = '<h3>AI Suggestions</h3>' + data.suggestions.map(s =>
    `<div>Ingredient ${s.ingredient_id}: reorder ${s.reorder_qty}</div>`
  ).join('');
}

document.querySelectorAll('.nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('openReceipt').onclick = ()=>createVoucher('receipts');
document.getElementById('openIssue').onclick = ()=>createVoucher('issues');
document.getElementById('openAdjust').onclick = ()=>createVoucher('adjustments');
document.getElementById('openSuggest').onclick = suggestReorder;

loadDashboard();

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
    loadDashboard();
  }catch(e){
    errEl.textContent = 'Login failed';
  }
}

document.getElementById('loginBtn').onclick = login;
document.getElementById('apiBase').value = API_BASE_DEFAULT;
if(getToken()) document.getElementById('loginModal').classList.add('hidden');
