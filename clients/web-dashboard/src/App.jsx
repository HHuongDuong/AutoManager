import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const navItems = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'sales', label: 'Bán hàng' },
  { id: 'inventory', label: 'Kho' },
  { id: 'hr', label: 'Nhân sự' },
  { id: 'reports', label: 'Báo cáo' },
  { id: 'ai', label: 'AI gợi ý' }
];

export default function App() {
  const [activeNav, setActiveNav] = useState('overview');
  const [apiBase, setApiBase] = useState(localStorage.getItem('apiBase') || 'http://localhost:3000');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [branchId, setBranchId] = useState(localStorage.getItem('branchId') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(!token);
  const [statusMessage, setStatusMessage] = useState('');

  const [revenue, setRevenue] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inventoryTx, setInventoryTx] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [aiSuggest, setAiSuggest] = useState([]);
  const [loading, setLoading] = useState(false);

  const totalRevenueToday = useMemo(() => {
    if (!revenue.length) return 0;
    const latest = revenue[revenue.length - 1];
    return Number(latest.revenue || 0);
  }, [revenue]);

  const orderCount = useMemo(() => orders.length, [orders]);

  const persistSettings = () => {
    localStorage.setItem('apiBase', apiBase);
    localStorage.setItem('branchId', branchId);
  };

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setLoading(true);
      setStatusMessage('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const params = new URLSearchParams();
        if (branchId) params.set('branch_id', branchId);
        const requests = await Promise.allSettled([
          fetch(`${apiBase}/reports/revenue?${params.toString()}`, { headers }),
          fetch(`${apiBase}/orders?${params.toString()}`, { headers }),
          fetch(`${apiBase}/audit-logs?limit=8`, { headers }),
          fetch(`${apiBase}/inventory/transactions?${params.toString()}`, { headers }),
          fetch(`${apiBase}/employees`, { headers })
        ]);

        const [revenueRes, ordersRes, auditRes, inventoryRes, employeesRes] = requests.map(r => r.status === 'fulfilled' ? r.value : null);
        const revenueData = revenueRes?.ok ? await revenueRes.json() : [];
        const ordersData = ordersRes?.ok ? await ordersRes.json() : [];
        const auditData = auditRes?.ok ? await auditRes.json() : [];
        const inventoryData = inventoryRes?.ok ? await inventoryRes.json() : [];
        const employeesData = employeesRes?.ok ? await employeesRes.json() : [];

        setRevenue(revenueData);
        setOrders(ordersData);
        setAuditLogs(auditData);
        setInventoryTx(inventoryData);
        setEmployees(employeesData);

        setInventoryAlerts([]);
      } catch (err) {
        setStatusMessage('Không thể tải dữ liệu. Kiểm tra API hoặc quyền truy cập.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBase, branchId, token]);

  const handleLogin = async () => {
    setStatusMessage('');
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!res.ok) throw new Error('login_failed');
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('apiBase', apiBase);
      setToken(data.access_token);
      setShowLogin(false);
    } catch (err) {
      setStatusMessage('Đăng nhập thất bại. Kiểm tra tài khoản hoặc API Base.');
    }
  };

  const revenueSeries = useMemo(() => revenue.map(row => Number(row.revenue || 0)), [revenue]);
  const revenueChartData = useMemo(() => {
    return revenue.map((row, idx) => ({
      name: row.bucket ? new Date(row.bucket).toLocaleDateString('vi-VN') : `#${idx + 1}`,
      value: Number(row.revenue || 0)
    }));
  }, [revenue]);

  const handleSuggestAI = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn branch_id để gợi ý nhập kho.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        items: inventoryAlerts.map(item => ({
          ingredient_id: item.id,
          on_hand: item.qty,
          series: [5, 6, 4, 7, 5, 6, 6]
        }))
      };
      const res = await fetch(`${apiBase}/ai/suggest-reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('ai_failed');
      const data = await res.json();
      setAiSuggest(data.suggestions || []);
    } catch (err) {
      setAiSuggest([
        { ingredient_id: 'demo-1', reorder_qty: 12, avg_daily: 5.4, target_stock: 38 },
        { ingredient_id: 'demo-2', reorder_qty: 8, avg_daily: 3.2, target_stock: 22 }
      ]);
    }
  };

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="brand">
          <h2>AutoManager</h2>
          <p>Web Dashboard</p>
        </div>
        <nav>
          {navItems.map(item => (
            <button
              key={item.id}
              className={activeNav === item.id ? 'active' : ''}
              onClick={() => setActiveNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <span>Chi nhánh</span>
            <strong>{branchId || 'Chưa chọn'}</strong>
          </div>
          <button className="btn ghost" onClick={() => setShowLogin(true)}>Cài đặt</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>Xin chào 👋</h1>
            <p>Theo dõi hiệu suất vận hành và bán hàng theo thời gian thực.</p>
          </div>
          <div className="top-actions">
            <input placeholder="Tìm báo cáo, đơn hàng..." />
            <button className="btn primary" onClick={() => setShowLogin(true)}>
              {token ? 'Cập nhật cấu hình' : 'Đăng nhập'}
            </button>
          </div>
        </header>

        <section className="metrics">
          <article>
            <h3>Doanh thu hôm nay</h3>
            <strong>{formatVnd(totalRevenueToday)}</strong>
            <span>So với hôm qua</span>
          </article>
          <article>
            <h3>Đơn hàng</h3>
            <strong>{orderCount}</strong>
            <span>Trong khoảng lọc</span>
          </article>
          <article>
            <h3>Cảnh báo tồn kho</h3>
            <strong>{inventoryAlerts.length}</strong>
            <span>Nguyên liệu cần theo dõi</span>
          </article>
          <article>
            <h3>Trạng thái hệ thống</h3>
            <strong>{loading ? 'Đang đồng bộ' : token ? 'Đã kết nối' : 'Chưa đăng nhập'}</strong>
            <span>{apiBase}</span>
          </article>
        </section>

        {activeNav === 'overview' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Biểu đồ doanh thu</h3>
                <span>{revenueChartData.length} điểm dữ liệu</span>
              </div>
              <div className="chart-wrapper">
                {revenueChartData.length === 0 ? (
                  <div className="empty">Chưa có dữ liệu doanh thu.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={revenueChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => formatVnd(value)} />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Đơn hàng gần đây</h3>
              <div className="list">
                {orders.slice(0, 6).map(order => (
                  <div key={order.id} className="list-item">
                    <div>
                      <h4>{order.id}</h4>
                      <p>{order.order_type}</p>
                    </div>
                    <strong>{formatVnd(order.total_amount)}</strong>
                  </div>
                ))}
                {orders.length === 0 && <div className="empty">Chưa có đơn hàng.</div>}
              </div>
            </div>

            <div className="card">
              <h3>Tồn kho cần nhập</h3>
              <div className="list">
                {inventoryAlerts.map(item => (
                  <div key={item.id} className="list-item">
                    <div>
                      <h4>{item.name}</h4>
                      <p>{item.status}</p>
                    </div>
                    <strong>{item.qty} kg</strong>
                  </div>
                ))}
                {inventoryAlerts.length === 0 && <div className="empty">Không có cảnh báo.</div>}
              </div>
            </div>

            <div className="card">
              <h3>Audit logs</h3>
              <div className="list">
                {auditLogs.map(log => (
                  <div key={log.id} className="list-item">
                    <div>
                      <h4>{log.action}</h4>
                      <p>{log.object_type} • {new Date(log.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <strong>{log.user_id?.slice(0, 8) || 'system'}</strong>
                  </div>
                ))}
                {auditLogs.length === 0 && <div className="empty">Chưa có audit log.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'sales' && (
          <section className="grid single">
            <div className="card">
              <div className="card-head">
                <h3>Danh sách đơn hàng</h3>
                <span>{orders.length} đơn</span>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Mã đơn</span>
                  <span>Loại</span>
                  <span>Trạng thái</span>
                  <span>Tổng</span>
                </div>
                {orders.map(order => (
                  <div key={order.id} className="table-row">
                    <span>{order.id}</span>
                    <span>{order.order_type}</span>
                    <span>{order.order_status || 'OPEN'}</span>
                    <strong>{formatVnd(order.total_amount)}</strong>
                  </div>
                ))}
                {orders.length === 0 && <div className="empty">Chưa có dữ liệu đơn hàng.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'inventory' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Giao dịch kho gần đây</h3>
                <button className="btn ghost" onClick={handleSuggestAI}>AI gợi ý nhập</button>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Nguyên liệu</span>
                  <span>Loại</span>
                  <span>Số lượng</span>
                  <span>Ngày</span>
                </div>
                {inventoryTx.slice(0, 8).map(tx => (
                  <div key={tx.id} className="table-row">
                    <span>{tx.ingredient_id}</span>
                    <span>{tx.transaction_type}</span>
                    <span>{tx.quantity}</span>
                    <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                ))}
                {inventoryTx.length === 0 && <div className="empty">Chưa có giao dịch kho.</div>}
              </div>
            </div>

            <div className="card">
              <h3>Gợi ý nhập kho</h3>
              <div className="list">
                {aiSuggest.map(item => (
                  <div key={item.ingredient_id} className="list-item">
                    <div>
                      <h4>{item.ingredient_id}</h4>
                      <p>Avg: {item.avg_daily} / Target: {item.target_stock}</p>
                    </div>
                    <strong>{item.reorder_qty} đơn vị</strong>
                  </div>
                ))}
                {aiSuggest.length === 0 && <div className="empty">Chưa có gợi ý nhập kho.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'hr' && (
          <section className="grid single">
            <div className="card">
              <div className="card-head">
                <h3>Nhân sự</h3>
                <span>{employees.length} nhân viên</span>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Họ tên</span>
                  <span>Chức vụ</span>
                  <span>Số điện thoại</span>
                  <span>Chi nhánh</span>
                </div>
                {employees.map(emp => (
                  <div key={emp.id} className="table-row">
                    <span>{emp.full_name || emp.username}</span>
                    <span>{emp.position || '---'}</span>
                    <span>{emp.phone || '---'}</span>
                    <span>{emp.branch_id || '---'}</span>
                  </div>
                ))}
                {employees.length === 0 && <div className="empty">Chưa có dữ liệu nhân viên.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'reports' && (
          <section className="grid">
            <div className="card">
              <h3>Tổng hợp doanh thu</h3>
              <p>Tổng doanh thu: {formatVnd(revenueSeries.reduce((sum, v) => sum + v, 0))}</p>
              <p>Đơn hàng: {orders.length}</p>
            </div>
            <div className="card">
              <h3>Audit logs</h3>
              <div className="list">
                {auditLogs.map(log => (
                  <div key={log.id} className="list-item">
                    <div>
                      <h4>{log.action}</h4>
                      <p>{log.object_type}</p>
                    </div>
                    <strong>{new Date(log.created_at).toLocaleDateString('vi-VN')}</strong>
                  </div>
                ))}
                {auditLogs.length === 0 && <div className="empty">Chưa có audit log.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'ai' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>AI gợi ý nhập kho</h3>
                <button className="btn ghost" onClick={handleSuggestAI}>Lấy gợi ý</button>
              </div>
              <div className="list">
                {aiSuggest.map(item => (
                  <div key={item.ingredient_id} className="list-item">
                    <div>
                      <h4>{item.ingredient_id}</h4>
                      <p>Avg: {item.avg_daily} / Target: {item.target_stock}</p>
                    </div>
                    <strong>{item.reorder_qty} đơn vị</strong>
                  </div>
                ))}
                {aiSuggest.length === 0 && <div className="empty">Chưa có gợi ý AI.</div>}
              </div>
            </div>
            <div className="card">
              <h3>Gợi ý vận hành</h3>
              <ul className="tips">
                <li>Tăng dự trữ nguyên liệu bán chạy cuối tuần.</li>
                <li>Khuyến nghị tối ưu staffing theo giờ cao điểm.</li>
                <li>So sánh doanh thu theo chi nhánh để điều chỉnh tồn kho.</li>
              </ul>
            </div>
          </section>
        )}

        {statusMessage && <div className="status">{statusMessage}</div>}
      </main>

      {showLogin && (
        <section className="modal">
          <div className="modal-card">
            <header>
              <h2>Cài đặt & Đăng nhập</h2>
              <button onClick={() => setShowLogin(false)}>×</button>
            </header>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-row">
                  <label>API Base</label>
                  <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} onBlur={persistSettings} />
                </div>
                <div className="form-row">
                  <label>Chi nhánh</label>
                  <input value={branchId} onChange={(e) => setBranchId(e.target.value)} onBlur={persistSettings} placeholder="branch_id" />
                </div>
                <div className="form-row">
                  <label>Tài khoản</label>
                  <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Mật khẩu</label>
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
              </div>
            </div>
            <footer>
              <button className="btn ghost" onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Đăng xuất</button>
              <button className="btn primary" onClick={handleLogin}>Đăng nhập</button>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
}
