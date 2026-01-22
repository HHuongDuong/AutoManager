import React, { useEffect, useMemo, useState } from 'react';

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const [apiBase, setApiBase] = useState(localStorage.getItem('apiBase') || 'http://localhost:3000');
  const [branchId, setBranchId] = useState(localStorage.getItem('branchId') || '');
  const [orderType, setOrderType] = useState(localStorage.getItem('orderType') || 'DINE_IN');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [orderQueue, setOrderQueue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('orderQueue') || '[]');
    } catch {
      return [];
    }
  });

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
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const saveQueue = (nextQueue) => {
    setOrderQueue(nextQueue);
    localStorage.setItem('orderQueue', JSON.stringify(nextQueue));
  };

  const enqueueOrder = (payload) => {
    const idempotencyKey = crypto.randomUUID();
    const item = {
      id: idempotencyKey,
      payload,
      status: 'queued',
      retries: 0,
      next_retry_at: Date.now()
    };
    saveQueue([item, ...orderQueue]);
    return item;
  };

  const processQueue = async () => {
    if (!isOnline || !token || orderQueue.length === 0) return;
    const now = Date.now();
    const updated = [...orderQueue];
    for (let i = 0; i < updated.length; i += 1) {
      const item = updated[i];
      if (item.status === 'synced') continue;
      if (item.next_retry_at && item.next_retry_at > now) continue;
      updated[i] = { ...item, status: 'sending' };
      saveQueue(updated);
      try {
        const res = await fetch(`${apiBase}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': item.id
          },
          body: JSON.stringify(item.payload)
        });
        if (!res.ok) throw new Error('order_failed');
        const data = await res.json();
        updated[i] = { ...item, status: 'synced', order_id: data.id };
        saveQueue(updated);
      } catch (err) {
        const retries = (item.retries || 0) + 1;
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, retries));
        updated[i] = {
          ...item,
          status: 'failed',
          retries,
          next_retry_at: Date.now() + backoffMs
        };
        saveQueue(updated);
      }
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(processQueue, 4000);
    return () => clearInterval(timer);
  }, [apiBase, isOnline, token, orderQueue]);


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
        setProducts([]);
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
    if (!isOnline) {
      enqueueOrder(payload);
      clearOrder();
      setShowPayment(false);
      setStatusMessage('Đang offline: đơn đã vào hàng đợi.');
      return;
    }
    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('order_failed');
      const data = await res.json();
      clearOrder();
      setShowPayment(false);
      setStatusMessage(`Tạo đơn thành công: ${data.id}`);
    } catch (err) {
      enqueueOrder(payload);
      clearOrder();
      setShowPayment(false);
      setStatusMessage('Không thể gửi ngay. Đã đưa vào hàng đợi.');
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
            <button className="btn ghost" onClick={processQueue}>Đồng bộ ({orderQueue.filter(i => i.status !== 'synced').length})</button>
            <button className="btn primary" onClick={() => setShowPayment(true)} disabled={!cart.length}>Thanh toán</button>
          </div>
          {statusMessage && <div className="status">{statusMessage}</div>}
          <div className="status">Trạng thái: {isOnline ? 'Online' : 'Offline'}</div>
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
