const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3000';
const getToken = () => localStorage.getItem('ACCESS_TOKEN');

async function fetchJSON(path){
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
  }catch(e){
    console.warn('Using mock data: set ACCESS_TOKEN in localStorage to fetch real data.');
  }
}

document.querySelectorAll('.nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

loadDashboard();
