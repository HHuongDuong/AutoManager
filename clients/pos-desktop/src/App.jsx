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
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(localStorage.getItem('categoryId') || '');
  const [ingredients, setIngredients] = useState([]);
  const [inventoryInputs, setInventoryInputs] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [openOrders, setOpenOrders] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [inputForm, setInputForm] = useState({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
  const [showInputModal, setShowInputModal] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [printers, setPrinters] = useState([]);
  const [printerName, setPrinterName] = useState(localStorage.getItem('printerName') || '');
  const [lastOrder, setLastOrder] = useState(null);
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
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
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

  useEffect(() => {
    loadPrinters();
  }, []);


  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const changeDue = Math.max(0, Number(cashReceived || 0) - total);

  const loadPrinters = async () => {
    if (!window?.electron?.printers?.list) return;
    try {
      const list = await window.electron.printers.list();
      setPrinters(list || []);
    } catch {
      setPrinters([]);
    }
  };

  const printReceipt = async (order) => {
    if (!window?.electron?.printers?.print) {
      setStatusMessage('Thiếu kết nối máy in Bluetooth.');
      return;
    }
    try {
      const payload = order?.id
        ? { order_id: order.id }
        : {
          branch_id: branchId || null,
          items: (order?.items?.length ? order.items : cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.price * item.quantity
          }))),
          created_at: order?.created_at || new Date().toISOString(),
          total_amount: order?.total_amount || total,
          payments: order?.payments || [{ payment_method: paymentMethod }]
        };
      const res = await fetch(`${apiBase}/receipts/format`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('receipt_failed');
      const data = await res.json();
      await window.electron.printers.print({ html: data.html || '', deviceName: printerName || undefined });
      setStatusMessage('Đã gửi lệnh in hóa đơn.');
    } catch (err) {
      setStatusMessage('Không thể in hóa đơn.');
    }
  };

  const refreshProducts = async () => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      if (categoryId) params.set('category_id', categoryId);
      if (search) params.set('q', search);
      const res = await fetch(`${apiBase}/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
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

  const refreshCategories = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/product-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      setCategories([]);
    }
  };

  const refreshIngredients = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/ingredients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      setIngredients([]);
    }
  };

  const refreshTables = async () => {
    if (!token || !branchId) return;
    try {
      const params = new URLSearchParams();
      params.set('branch_id', branchId);
      const res = await fetch(`${apiBase}/tables?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setTables(data || []);
    } catch (err) {
      setTables([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch(`${apiBase}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) setShowLogin(true);
  }, [token]);

  useEffect(() => {
    refreshProducts();
  }, [apiBase, branchId, categoryId, search, token]);

  useEffect(() => {
    refreshIngredients();
  }, [apiBase, token]);

  useEffect(() => {
    refreshCategories();
  }, [apiBase, token]);

  useEffect(() => {
    refreshTables();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (orderType !== 'DINE_IN') setSelectedTableId('');
  }, [orderType]);

  useEffect(() => {
    if (!token || !branchId) return;
    const controller = new AbortController();
    const fetchInputs = async () => {
      try {
        const params = new URLSearchParams();
        params.set('branch_id', branchId);
        const res = await fetch(`${apiBase}/inventory/inputs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        setInventoryInputs(data);
      } catch (err) {
        setInventoryInputs([]);
      }
    };
    fetchInputs();
    return () => controller.abort();
  }, [apiBase, branchId, token]);

  const refreshInputs = async () => {
    if (!token || !branchId) return;
    try {
      const params = new URLSearchParams();
      params.set('branch_id', branchId);
      const res = await fetch(`${apiBase}/inventory/inputs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setInventoryInputs(data);
    } catch {
      setInventoryInputs([]);
    }
  };

  const fetchOpenOrders = async () => {
    if (!token || !branchId) return;
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      params.set('branch_id', branchId);
      params.set('status', 'OPEN');
      const res = await fetch(`${apiBase}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setOpenOrders(data);
    } catch {
      setOpenOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadOrder = async (orderId) => {
    if (!token || !orderId) return;
    try {
      const res = await fetch(`${apiBase}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setCurrentOrderId(data.id);
      setCart((data.items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      })));
      setStatusMessage(`Đang chỉnh phiếu: ${data.id}`);
    } catch {
      setStatusMessage('Không thể tải phiếu.');
    }
  };

  useEffect(() => {
    refreshInputs();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    fetchOpenOrders();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (!token) return undefined;
    const url = new URL(apiBase.replace('http', 'ws'));
    url.pathname = '/ws';
    url.searchParams.set('token', token);
    if (branchId) url.searchParams.set('branch_id', branchId);
    const ws = new WebSocket(url.toString());
    setWsStatus('connecting');
    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data || '{}');
        if (msg.event?.startsWith('inventory.')) refreshInputs();
        if (msg.event?.startsWith('ingredient.')) refreshIngredients();
        if (msg.event?.startsWith('product.') || msg.event?.startsWith('product_category.')) {
          refreshProducts();
          if (msg.event?.startsWith('product_category.')) refreshCategories();
        }
        if (msg.event?.startsWith('order.') || msg.event?.startsWith('table.')) {
          fetchOpenOrders();
          if (msg.event?.startsWith('table.')) refreshTables();
          setStatusMessage(`Realtime: ${msg.event}`);
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [apiBase, branchId, token]);

  const addToCart = async (product) => {
    if (currentOrderId) {
      try {
        const res = await fetch(`${apiBase}/orders/${currentOrderId}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            product_id: product.id,
            name: product.name,
            quantity: 1,
            unit_price: Number(product.price || 0)
          })
        });
        if (!res.ok) throw new Error('add_failed');
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Không thể thêm món vào phiếu.');
      }
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id || item.id === product.id);
      if (existing) {
        return prev.map(item => (item.product_id === product.id || item.id === product.id)
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }
      return [...prev, { id: product.id, product_id: product.id, name: product.name, price: Number(product.price || 0), quantity: 1 }];
    });
  };

  const updateQty = async (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const nextQty = Math.max(1, item.quantity + delta);
    if (currentOrderId) {
      try {
        const res = await fetch(`${apiBase}/orders/${currentOrderId}/items/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ quantity: nextQty })
        });
        if (!res.ok) throw new Error('update_failed');
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Không thể cập nhật số lượng.');
      }
      return;
    }
    setCart(prev => prev
      .map(row => row.id === id ? { ...row, quantity: nextQty } : row)
      .filter(row => row.quantity > 0)
    );
  };

  const removeItem = async (id) => {
    if (currentOrderId) {
      try {
        const res = await fetch(`${apiBase}/orders/${currentOrderId}/items/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('delete_failed');
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Không thể xoá món khỏi phiếu.');
      }
      return;
    }
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearOrder = () => {
    setCart([]);
    setCashReceived(0);
    setStatusMessage('');
    setCurrentOrderId('');
    setSelectedTableId('');
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

  const handleChangePassword = async () => {
    if (!passwordForm.old_password || !passwordForm.new_password) {
      setStatusMessage('Cần mật khẩu cũ và mật khẩu mới.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setStatusMessage('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/users/me/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        })
      });
      if (!res.ok) throw new Error('password_failed');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setStatusMessage('Đã đổi mật khẩu.');
    } catch (err) {
      setStatusMessage('Không thể đổi mật khẩu.');
    }
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setStatusMessage('Cần chọn bàn cho đơn tại chỗ.');
      return;
    }
    if (currentOrderId) {
      try {
        setStatusMessage('Đang thanh toán...');
        const payRes = await fetch(`${apiBase}/orders/${currentOrderId}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: total, payment_method: paymentMethod })
        });
        if (!payRes.ok) throw new Error('payment_failed');
        await fetch(`${apiBase}/orders/${currentOrderId}/close`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const orderRes = await fetch(`${apiBase}/orders/${currentOrderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const orderData = orderRes.ok ? await orderRes.json() : null;
        setLastOrder(orderData);
        if (orderData) printReceipt(orderData);
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Đã thanh toán: ${currentOrderId}`);
        fetchOpenOrders();
      } catch (err) {
        setStatusMessage('Không thể thanh toán phiếu.');
      }
      return;
    }
    setStatusMessage('Đang tạo đơn...');
    const payload = {
      branch_id: branchId,
      order_type: orderType,
      table_id: orderType === 'DINE_IN' ? selectedTableId : null,
      items: cart.map(item => ({
        product_id: item.product_id || (item.id.startsWith('p-') ? null : item.id),
        name: item.name,
        unit_price: item.price,
        quantity: item.quantity
      }))
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
      setLastOrder(data);
      if (payNow) {
        const payRes = await fetch(`${apiBase}/orders/${data.id}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: total, payment_method: paymentMethod })
        });
        if (!payRes.ok) throw new Error('payment_failed');
        await fetch(`${apiBase}/orders/${data.id}/close`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        printReceipt(data);
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Đã thanh toán: ${data.id}`);
      } else {
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Đã lưu phiếu: ${data.id}`);
      }
      fetchOpenOrders();
    } catch (err) {
      enqueueOrder(payload);
      clearOrder();
      setShowPayment(false);
      setStatusMessage('Không thể gửi ngay. Đã đưa vào hàng đợi.');
    }
  };

  const handleSaveOrder = async () => {
    if (cart.length === 0) return;
    if (currentOrderId) {
      setStatusMessage('Phiếu đã được lưu.');
      return;
    }
    setStatusMessage('Đang lưu phiếu...');
    const payload = {
      branch_id: branchId,
      order_type: orderType,
      items: cart.map(item => ({
        product_id: item.product_id || (item.id.startsWith('p-') ? null : item.id),
        name: item.name,
        unit_price: item.price,
        quantity: item.quantity
      }))
    };
    if (!isOnline) {
      enqueueOrder(payload);
      clearOrder();
      setStatusMessage('Đang offline: phiếu đã vào hàng đợi.');
      return;
    }
    try {
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
      setLastOrder(data);
      clearOrder();
      setStatusMessage(`Đã lưu phiếu: ${data.id}`);
      fetchOpenOrders();
    } catch (err) {
      setStatusMessage('Không thể lưu phiếu.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt('Nhập lý do xóa phiếu');
    if (!reason) return;
    try {
      const res = await fetch(`${apiBase}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('cancel_failed');
      if (currentOrderId === orderId) clearOrder();
      setStatusMessage('Đã xóa phiếu.');
      fetchOpenOrders();
    } catch (err) {
      setStatusMessage('Không thể xóa phiếu.');
    }
  };

  const handleCreateInput = async () => {
    if (!branchId) {
      setStatusMessage('Cần branch_id để nhập kho.');
      return;
    }
    if (!inputForm.ingredient_id || !inputForm.quantity) {
      setStatusMessage('Cần nguyên liệu và số lượng.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        reason: inputForm.reason || null,
        items: [
          {
            ingredient_id: inputForm.ingredient_id,
            quantity: Number(inputForm.quantity),
            unit_cost: inputForm.unit_cost ? Number(inputForm.unit_cost) : null
          }
        ]
      };
      const res = await fetch(`${apiBase}/inventory/inputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('input_failed');
      const data = await res.json();
      setInventoryInputs(prev => [...data.items, ...prev]);
      setInputForm({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
      setShowInputModal(false);
      setStatusMessage('Nhập kho thành công.');
    } catch (err) {
      setStatusMessage('Không thể nhập kho.');
    }
  };

  const persistSettings = () => {
    localStorage.setItem('apiBase', apiBase);
    localStorage.setItem('branchId', branchId);
    localStorage.setItem('orderType', orderType);
    localStorage.setItem('printerName', printerName);
    localStorage.setItem('categoryId', categoryId);
  };

  const handlePrintLast = () => {
    if (!lastOrder && cart.length === 0) {
      setStatusMessage('Chưa có đơn để in.');
      return;
    }
    printReceipt(lastOrder || null);
  };

  return (
    <div className="pos-root">
      {token ? (
        <>
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
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Tất cả nhóm</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
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
              {orderType === 'DINE_IN' && (
                <div className="form-row">
                  <label>Chọn bàn</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                  >
                    <option value="">-- Chọn bàn --</option>
                    {tables.filter(table => table.status === 'AVAILABLE').map(table => (
                      <option key={table.id} value={table.id}>
                        {table.name} ({table.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentOrderId && <div className="status">Đang chỉnh phiếu: {currentOrderId}</div>}
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
            <button className="btn ghost" onClick={() => setShowInputModal(true)}>Nhập kho</button>
            <button className="btn ghost" onClick={handlePrintLast}>In hóa đơn</button>
            <button className="btn ghost" onClick={handleSaveOrder} disabled={!cart.length || !!currentOrderId}>Lưu phiếu</button>
            <button className="btn primary" onClick={() => setShowPayment(true)} disabled={!cart.length}>Thanh toán</button>
          </div>
          {statusMessage && <div className="status">{statusMessage}</div>}
          <div className="methods">
            <h4>Phiếu mở</h4>
            {loadingOrders && <div className="empty">Đang tải phiếu...</div>}
            {!loadingOrders && openOrders.length === 0 && <div className="empty">Chưa có phiếu mở.</div>}
            <div className="cart-list">
              {openOrders.slice(0, 6).map(order => (
                <div key={order.id} className="cart-item">
                  <div>
                    <h4>{order.id}</h4>
                    <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <button className="btn ghost" onClick={() => loadOrder(order.id)}>Mở</button>
                  <button className="btn ghost" onClick={() => handleCancelOrder(order.id)}>Xoá</button>
                </div>
              ))}
            </div>
          </div>
          <div className="status">Trạng thái: {isOnline ? 'Online' : 'Offline'} • WS: {wsStatus}</div>
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

      {showInputModal && (
        <section className="modal">
          <div className="modal-card">
            <header>
              <h2>Nhập kho nguyên liệu</h2>
              <button onClick={() => setShowInputModal(false)}>×</button>
            </header>
            <div className="modal-body">
              <div className="summary">
                <div className="form-row">
                  <label>Nguyên liệu</label>
                  <select
                    value={inputForm.ingredient_id}
                    onChange={(e) => setInputForm({ ...inputForm, ingredient_id: e.target.value })}
                  >
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Số lượng</label>
                  <input
                    type="number"
                    value={inputForm.quantity}
                    onChange={(e) => setInputForm({ ...inputForm, quantity: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Đơn giá</label>
                  <input
                    type="number"
                    value={inputForm.unit_cost}
                    onChange={(e) => setInputForm({ ...inputForm, unit_cost: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Lý do</label>
                  <input
                    value={inputForm.reason}
                    onChange={(e) => setInputForm({ ...inputForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="methods">
                <h4>Phiếu nhập gần đây</h4>
                <div className="cart-list">
                  {inventoryInputs.slice(0, 6).map(input => (
                    <div key={input.id} className="cart-item">
                      <div>
                        <h4>{input.ingredient_id}</h4>
                        <span>{input.quantity} • {formatVnd(input.unit_cost || 0)}</span>
                      </div>
                      <strong>{formatVnd(input.total_cost || 0)}</strong>
                    </div>
                  ))}
                  {inventoryInputs.length === 0 && <div className="empty">Chưa có phiếu nhập.</div>}
                </div>
              </div>
            </div>
            <footer>
              <button className="btn ghost" onClick={() => setShowInputModal(false)}>Đóng</button>
              <button className="btn primary" onClick={handleCreateInput}>Tạo phiếu nhập</button>
            </footer>
          </div>
        </section>
      )}

        </>
      ) : (
        <main className="layout">
          <section className="summary">
            <div className="card">
              <h3>Vui lòng đăng nhập</h3>
              <p>Bạn cần đăng nhập để thao tác bán hàng.</p>
              <button className="btn primary" onClick={() => setShowLogin(true)}>Đăng nhập</button>
            </div>
          </section>
        </main>
      )}

      {showLogin && (
        <section className="modal">
          <div className="modal-card">
            <header>
              <h2>Cài đặt & Đăng nhập</h2>
              {token && <button onClick={() => setShowLogin(false)}>×</button>}
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
                  <label>Máy in Bluetooth</label>
                  <select value={printerName} onChange={(e) => { setPrinterName(e.target.value); persistSettings(); }}>
                    <option value="">Máy in mặc định</option>
                    {printers.map((p) => (
                      <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                    ))}
                  </select>
                  <small className="hint">Hãy ghép đôi máy in Bluetooth trong Windows trước khi chọn ở đây.</small>
                </div>
                <div className="form-row">
                  <label>In thử</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn ghost" type="button" onClick={loadPrinters}>Làm mới máy in</button>
                    <button className="btn ghost" type="button" onClick={() => printReceipt(lastOrder || null)}>In thử</button>
                  </div>
                </div>
                <div className="form-row">
                  <label>Tài khoản</label>
                  <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Mật khẩu</label>
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
                {token && (
                  <>
                    <div className="form-row">
                      <label>Mật khẩu cũ</label>
                      <input type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>Mật khẩu mới</label>
                      <input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <label>Xác nhận mật khẩu mới</label>
                      <input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <footer>
              {token && (
                <button className="btn ghost" onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Đăng xuất</button>
              )}
              {token && (
                <button className="btn ghost" onClick={handleChangePassword}>Đổi mật khẩu</button>
              )}
              <button className="btn primary" onClick={handleLogin}>Đăng nhập</button>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
}
