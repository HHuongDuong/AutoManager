import React, { useEffect, useMemo, useState } from 'react';

const fallbackProducts = [
  { id: 'p-1', name: 'Cà phê sữa', price: 29000 },
  { id: 'p-2', name: 'Bạc xỉu', price: 32000 },
  { id: 'p-3', name: 'Trà đào cam sả', price: 35000 },
  { id: 'p-4', name: 'Matcha latte', price: 42000 },
  { id: 'p-5', name: 'Bánh croissant', price: 28000 }
];

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const [apiBase, setApiBase] = useState(localStorage.getItem('apiBase') || 'http://localhost:3000');
  const [branchId, setBranchId] = useState(localStorage.getItem('branchId') || '');
  const [orderType, setOrderType] = useState(localStorage.getItem('orderType') || 'DINE_IN');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [payNow, setPayNow] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [showLogin, setShowLogin] = useState(!token);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const changeDue = Math.max(0, Number(cashReceived || 0) - total);

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        if (branchId) params.set('branch_id', branchId);
        if (search) params.set('q', search);
        const res = await fetch(`${apiBase}/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setProducts(fallbackProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())));
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, [apiBase, branchId, search, token]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: Number(product.price || 0), quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const clearOrder = () => {
    setCart([]);
    setCashReceived(0);
    setStatusMessage('');
  };

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

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    setStatusMessage('Đang tạo đơn...');
    try {
      const payload = {
        branch_id: branchId,
        order_type: orderType,
        items: cart.map(item => ({
          product_id: item.id.startsWith('p-') ? null : item.id,
          name: item.name,
          unit_price: item.price,
          quantity: item.quantity
        })),
        payments: payNow ? [{ amount: total, payment_method: paymentMethod }] : []
      };
      const res = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('order_failed');
      const data = await res.json();
      clearOrder();
      setShowPayment(false);
      setStatusMessage(`Tạo đơn thành công: ${data.id}`);
    } catch (err) {
      setStatusMessage('Tạo đơn thất bại. Kiểm tra cấu hình chi nhánh.');
    }
  };

  const persistSettings = () => {
    localStorage.setItem('apiBase', apiBase);
    localStorage.setItem('branchId', branchId);
    localStorage.setItem('orderType', orderType);
  };

  return (
    <div className="pos-root">
      <header className="topbar">
        <div className="brand">
          <span className="badge">AutoManager</span>
          <div>
            <h1>POS Desktop</h1>
            <p>Giao diện thu ngân cho cửa hàng</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="meta">
            <span>Chi nhánh</span>
            <strong>{branchId || 'Chưa chọn'}</strong>
          </div>
          <div className="meta">
            <span>Nhân viên</span>
            <strong>{user?.employee?.full_name || user?.user_id || '---'}</strong>
          </div>
          <button className="btn ghost" onClick={() => setShowLogin(true)}>Cài đặt</button>
        </div>
      </header>

      <main className="layout">
        <section className="menu-panel">
          <div className="search-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món, SKU..."
            />
            <button className="btn ghost" onClick={() => setSearch('')}>Xoá</button>
          </div>
          <div className="menu-grid">
            {loadingProducts && <div className="card">Đang tải món...</div>}
            {!loadingProducts && products.length === 0 && (
              <div className="card">Không có dữ liệu món.</div>
            )}
            {products.map(product => (
              <button key={product.id || product.name} className="menu-item" onClick={() => addToCart(product)}>
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.sku || '---'}</p>
                </div>
                <strong>{formatVnd(product.price)}</strong>
              </button>
            ))}
          </div>
        </section>

        <aside className="cart-panel">
          <div className="cart-header">
            <h2>Hoá đơn</h2>
            <button className="btn ghost" onClick={clearOrder}>Tạo mới</button>
          </div>
          <div className="cart-list">
            {cart.length === 0 && <div className="empty">Chưa có món nào.</div>}
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div>
                  <h4>{item.name}</h4>
                  <span>{formatVnd(item.price)}</span>
                </div>
                <div className="qty">
                  <button onClick={() => updateQty(item.id, -1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <strong>{formatVnd(item.price * item.quantity)}</strong>
                <button className="icon" onClick={() => removeItem(item.id)}>×</button>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div>
              <span>Tạm tính</span>
              <strong>{formatVnd(total)}</strong>
            </div>
            <div>
              <span>Giảm giá</span>
              <strong>{formatVnd(0)}</strong>
            </div>
            <div className="total">
              <span>Tổng cộng</span>
              <strong>{formatVnd(total)}</strong>
            </div>
          </div>
          <div className="cart-actions">
            <button className="btn ghost">Lưu tạm</button>
            <button className="btn primary" onClick={() => setShowPayment(true)} disabled={!cart.length}>Thanh toán</button>
          </div>
          {statusMessage && <div className="status">{statusMessage}</div>}
        </aside>
      </main>

      {showPayment && (
        <section className="modal">
          <div className="modal-card">
            <header>
              <h2>Thanh toán</h2>
              <button onClick={() => setShowPayment(false)}>×</button>
            </header>
            <div className="modal-body">
              <div className="summary">
                <p>Tổng tiền</p>
                <h3>{formatVnd(total)}</h3>
                <div className="form-row">
                  <label>Khách đưa</label>
                  <input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
                </div>
                <div className="form-row">
                  <label>Tiền thối</label>
                  <input value={formatVnd(changeDue)} disabled />
                </div>
              </div>
              <div className="methods">
                <h4>Phương thức</h4>
                <div className="method-grid">
                  {['CASH', 'CARD', 'EWALLET', 'TRANSFER'].map(method => (
                    <button
                      key={method}
                      className={paymentMethod === method ? 'active' : ''}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method === 'CASH' ? 'Tiền mặt' : method === 'CARD' ? 'Thẻ' : method === 'EWALLET' ? 'Ví điện tử' : 'Chuyển khoản'}
                    </button>
                  ))}
                </div>
                <div className="toggle">
                  <input type="checkbox" checked={payNow} onChange={() => setPayNow(v => !v)} />
                  <span>Thanh toán ngay</span>
                </div>
              </div>
            </div>
            <footer>
              <button className="btn ghost" onClick={() => setShowPayment(false)}>Để sau</button>
              <button className="btn primary" onClick={handleCreateOrder}>Xác nhận</button>
            </footer>
          </div>
        </section>
      )}

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
                  <label>Loại đơn</label>
                  <select value={orderType} onChange={(e) => { setOrderType(e.target.value); persistSettings(); }}>
                    <option value="DINE_IN">DINE_IN</option>
                    <option value="TAKE_AWAY">TAKE_AWAY</option>
                    <option value="DELIVERY">DELIVERY</option>
                  </select>
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
