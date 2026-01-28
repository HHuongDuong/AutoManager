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
  { id: 'menu', label: 'Thực đơn' },
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
  const [inventoryInputs, setInventoryInputs] = useState([]);
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [stocktakes, setStocktakes] = useState([]);
  const [stocktakeItems, setStocktakeItems] = useState([]);
  const [stocktakeNote, setStocktakeNote] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [inventoryCategoryName, setInventoryCategoryName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [aiSuggest, setAiSuggest] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    sku: '',
    price: '',
    category_id: ''
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [branchPrice, setBranchPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputForm, setInputForm] = useState({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });

  const totalRevenueToday = useMemo(() => {
    if (!revenue.length) return 0;
    const latest = revenue[revenue.length - 1];
    return Number(latest.revenue || 0);
  }, [revenue]);

  const orderCount = useMemo(() => orders.length, [orders]);
  const categoryMap = useMemo(() => new Map(categories.map(cat => [cat.id, cat.name])), [categories]);

  const persistSettings = () => {
    localStorage.setItem('apiBase', apiBase);
    localStorage.setItem('branchId', branchId);
  };

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
        fetch(`${apiBase}/inventory/inputs?${params.toString()}`, { headers }),
        fetch(`${apiBase}/employees`, { headers })
      ]);

      const [revenueRes, ordersRes, auditRes, inventoryRes, inputsRes, employeesRes] = requests.map(r => r.status === 'fulfilled' ? r.value : null);
      const revenueData = revenueRes?.ok ? await revenueRes.json() : [];
      const ordersData = ordersRes?.ok ? await ordersRes.json() : [];
      const auditData = auditRes?.ok ? await auditRes.json() : [];
      const inventoryData = inventoryRes?.ok ? await inventoryRes.json() : [];
      const inputsData = inputsRes?.ok ? await inputsRes.json() : [];
      const employeesData = employeesRes?.ok ? await employeesRes.json() : [];

      setRevenue(revenueData);
      setOrders(ordersData);
      setAuditLogs(auditData);
      setInventoryTx(inventoryData);
      setInventoryInputs(inputsData);
      setEmployees(employeesData);

      setInventoryAlerts([]);
    } catch (err) {
      setStatusMessage('Không thể tải dữ liệu. Kiểm tra API hoặc quyền truy cập.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuData = async () => {
    if (!token) return;
    setStatusMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      if (categoryId) params.set('category_id', categoryId);
      if (productSearch) params.set('q', productSearch);
      const [catRes, prodRes] = await Promise.all([
        fetch(`${apiBase}/product-categories`, { headers }),
        fetch(`${apiBase}/products?${params.toString()}`, { headers })
      ]);
      const catData = catRes.ok ? await catRes.json() : [];
      const prodData = prodRes.ok ? await prodRes.json() : [];
      setCategories(catData);
      setProducts(prodData);
    } catch (err) {
      setCategories([]);
      setProducts([]);
    }
  };

  const fetchInventoryMeta = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      const [catRes, ingRes, stockRes] = await Promise.all([
        fetch(`${apiBase}/inventory/categories`, { headers }),
        fetch(`${apiBase}/ingredients`, { headers }),
        fetch(`${apiBase}/stocktakes?${params.toString()}`, { headers })
      ]);
      const catData = catRes.ok ? await catRes.json() : [];
      const ingData = ingRes.ok ? await ingRes.json() : [];
      const stockData = stockRes.ok ? await stockRes.json() : [];
      setInventoryCategories(catData);
      setIngredients(ingData);
      setStocktakes(stockData);
    } catch (err) {
      setInventoryCategories([]);
      setIngredients([]);
      setStocktakes([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (activeNav !== 'menu') return;
    fetchMenuData();
  }, [activeNav, apiBase, branchId, categoryId, productSearch, token]);

  useEffect(() => {
    if (activeNav !== 'inventory') return;
    fetchInventoryMeta();
  }, [activeNav, apiBase, branchId, token]);

  useEffect(() => {
    if (!token) return undefined;
    const wsUrl = apiBase.replace('https', 'wss').replace('http', 'ws');
    const url = `${wsUrl}/ws?token=${encodeURIComponent(token)}${branchId ? `&branch_id=${encodeURIComponent(branchId)}` : ''}`;
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data || '{}');
        if (msg.event) fetchData();
        if (msg.event?.startsWith('product.') || msg.event?.startsWith('product_category.')) fetchMenuData();
        if (msg.event?.startsWith('inventory.category.') || msg.event?.startsWith('inventory.stocktake.')) fetchInventoryMeta();
      } catch {
        // ignore
      }
    };
    return () => ws.close();
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

  const handleCreateInput = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn branch_id để nhập kho.');
      return;
    }
    if (!inputForm.ingredient_id || !inputForm.quantity) {
      setStatusMessage('Cần ingredient_id và số lượng.');
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
      setInputForm({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
      setInventoryInputs(prev => [...data.items, ...prev]);
      setStatusMessage('Nhập kho thành công.');
    } catch (err) {
      setStatusMessage('Không thể nhập kho.');
    }
  };

  const handleAddStocktakeItem = () => {
    if (!selectedIngredient || actualQty === '') return;
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (!ingredient) return;
    setStocktakeItems(prev => {
      const existing = prev.find(item => item.ingredient_id === selectedIngredient);
      if (existing) {
        return prev.map(item => item.ingredient_id === selectedIngredient ? { ...item, actual_qty: actualQty } : item);
      }
      return [...prev, { ingredient_id: selectedIngredient, name: ingredient.name, actual_qty: actualQty }];
    });
    setSelectedIngredient('');
    setActualQty('');
  };

  const handleCreateStocktake = async () => {
    if (!branchId) {
      setStatusMessage('Cần branch_id để kiểm kê.');
      return;
    }
    if (stocktakeItems.length === 0) {
      setStatusMessage('Cần ít nhất 1 dòng kiểm kê.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        note: stocktakeNote || null,
        items: stocktakeItems.map(item => ({
          ingredient_id: item.ingredient_id,
          actual_qty: Number(item.actual_qty)
        }))
      };
      const res = await fetch(`${apiBase}/stocktakes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('stocktake_failed');
      const data = await res.json();
      setStocktakes(prev => [data, ...prev]);
      setStocktakeItems([]);
      setStocktakeNote('');
      setStatusMessage('Đã tạo phiếu kiểm kê.');
    } catch (err) {
      setStatusMessage('Không thể tạo phiếu kiểm kê.');
    }
  };

  const handleApproveStocktake = async (stocktakeId) => {
    try {
      const res = await fetch(`${apiBase}/stocktakes/${stocktakeId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('approve_failed');
      setStocktakes(prev => prev.map(item => item.id === stocktakeId ? { ...item, status: 'APPROVED' } : item));
      setStatusMessage('Đã duyệt phiếu kiểm kê.');
    } catch (err) {
      setStatusMessage('Không thể duyệt phiếu kiểm kê.');
    }
  };

  const handleCreateInventoryCategory = async () => {
    if (!inventoryCategoryName.trim()) {
      setStatusMessage('Cần tên phân loại kho.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/inventory/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: inventoryCategoryName.trim() })
      });
      if (!res.ok) throw new Error('category_failed');
      const data = await res.json();
      setInventoryCategories(prev => [...prev, data]);
      setInventoryCategoryName('');
      setStatusMessage('Đã tạo phân loại kho.');
    } catch (err) {
      setStatusMessage('Không thể tạo phân loại kho.');
    }
  };

  const handleUpdateIngredientCategory = async (ingredientId, categoryIdValue) => {
    try {
      const res = await fetch(`${apiBase}/ingredients/${ingredientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ category_id: categoryIdValue || null })
      });
      if (!res.ok) throw new Error('ingredient_update_failed');
      const data = await res.json();
      setIngredients(prev => prev.map(item => item.id === data.id ? { ...item, category_id: data.category_id } : item));
      setStatusMessage('Đã cập nhật phân loại nguyên liệu.');
    } catch (err) {
      setStatusMessage('Không thể cập nhật phân loại nguyên liệu.');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setStatusMessage('Cần tên nhóm sản phẩm.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/product-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: categoryName.trim() })
      });
      if (!res.ok) throw new Error('category_failed');
      const data = await res.json();
      setCategories(prev => [...prev, data]);
      setCategoryName('');
      setStatusMessage('Đã tạo nhóm sản phẩm.');
    } catch (err) {
      setStatusMessage('Không thể tạo nhóm sản phẩm.');
    }
  };

  const resetProductForm = () => {
    setProductForm({ id: '', name: '', sku: '', price: '', category_id: '' });
    setProductImageFile(null);
    setBranchPrice('');
  };

  const handleCreateProduct = async () => {
    if (!branchId) {
      setStatusMessage('Cần branch_id để tạo sản phẩm.');
      return;
    }
    if (!productForm.name || productForm.price === '') {
      setStatusMessage('Cần tên và giá sản phẩm.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branchId,
          name: productForm.name,
          sku: productForm.sku || null,
          price: Number(productForm.price),
          category_id: productForm.category_id || null
        })
      });
      if (!res.ok) throw new Error('product_create_failed');
      const data = await res.json();
      setProducts(prev => [data, ...prev]);
      if (branchId && branchPrice !== '') {
        await fetch(`${apiBase}/products/${data.id}/branch-price`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ branch_id: branchId, price: Number(branchPrice) })
        });
      }
      resetProductForm();
      setStatusMessage('Đã tạo sản phẩm.');
    } catch (err) {
      setStatusMessage('Không thể tạo sản phẩm.');
    }
  };

  const handleEditProduct = (product) => {
    setProductForm({
      id: product.id,
      name: product.name || '',
      sku: product.sku || '',
      price: product.price != null ? String(product.price) : '',
      category_id: product.category_id || ''
    });
    setBranchPrice(product.branch_price != null ? String(product.branch_price) : '');
  };

  const handleUpdateProduct = async () => {
    if (!productForm.id) return;
    try {
      const res = await fetch(`${apiBase}/products/${productForm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: productForm.name || null,
          sku: productForm.sku || null,
          price: productForm.price === '' ? null : Number(productForm.price),
          category_id: productForm.category_id || null
        })
      });
      if (!res.ok) throw new Error('product_update_failed');
      const data = await res.json();
      setProducts(prev => prev.map(item => item.id === data.id ? data : item));
      if (branchId && branchPrice !== '') {
        await fetch(`${apiBase}/products/${productForm.id}/branch-price`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ branch_id: branchId, price: Number(branchPrice) })
        });
      }
      resetProductForm();
      setStatusMessage('Đã cập nhật sản phẩm.');
    } catch (err) {
      setStatusMessage('Không thể cập nhật sản phẩm.');
    }
  };

  const handleUploadProductImage = async () => {
    if (!productForm.id) {
      setStatusMessage('Cần chọn sản phẩm để upload ảnh.');
      return;
    }
    if (!productImageFile) {
      setStatusMessage('Chọn ảnh sản phẩm trước khi upload.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', productImageFile);
      const res = await fetch(`${apiBase}/products/${productForm.id}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('image_upload_failed');
      const data = await res.json();
      setProducts(prev => prev.map(item => item.id === data.id ? { ...item, image_url: data.image_url } : item));
      setProductImageFile(null);
      setStatusMessage('Đã upload ảnh sản phẩm.');
    } catch (err) {
      setStatusMessage('Không thể upload ảnh sản phẩm.');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product?.id) return;
    if (!confirm(`Xoá sản phẩm "${product.name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('product_delete_failed');
      setProducts(prev => prev.filter(item => item.id !== product.id));
      setStatusMessage('Đã xoá sản phẩm.');
      if (productForm.id === product.id) resetProductForm();
    } catch (err) {
      setStatusMessage('Không thể xoá sản phẩm.');
    }
  };

  const downloadReport = async (path, format = 'xlsx') => {
    if (!token) return;
    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    params.set('format', format);
    try {
      const res = await fetch(`${apiBase}${path}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('export_failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${path.split('/').pop()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatusMessage('Không thể xuất file báo cáo.');
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

        {activeNav === 'menu' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Nhóm sản phẩm</h3>
                <span>{categories.length} nhóm</span>
              </div>
              <div className="form-row">
                <label>Tên nhóm</label>
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ví dụ: Đồ uống" />
              </div>
              <button className="btn primary" onClick={handleCreateCategory}>Tạo nhóm</button>
              <div className="list">
                {categories.map(cat => (
                  <div key={cat.id} className="list-item">
                    <div>
                      <h4>{cat.name}</h4>
                      <p>{cat.id}</p>
                    </div>
                    <strong>Nhóm</strong>
                  </div>
                ))}
                {categories.length === 0 && <div className="empty">Chưa có nhóm sản phẩm.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Danh sách sản phẩm</h3>
                <span>{products.length} sản phẩm</span>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Tên sản phẩm</label>
                  <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>SKU</label>
                  <input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Giá</label>
                  <input value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Nhóm</label>
                  <select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                    <option value="">Chưa phân loại</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                {branchId && (
                  <div className="form-row">
                    <label>Giá theo chi nhánh</label>
                    <input value={branchPrice} onChange={(e) => setBranchPrice(e.target.value)} placeholder="Giá tại chi nhánh" />
                  </div>
                )}
                {productForm.id && (
                  <div className="form-row">
                    <label>Ảnh sản phẩm</label>
                    <input type="file" accept="image/*" onChange={(e) => setProductImageFile(e.target.files?.[0] || null)} />
                    <button className="btn ghost" onClick={handleUploadProductImage}>Upload ảnh</button>
                  </div>
                )}
              </div>
              <div className="actions">
                {productForm.id ? (
                  <>
                    <button className="btn primary" onClick={handleUpdateProduct}>Cập nhật</button>
                    <button className="btn ghost" onClick={resetProductForm}>Huỷ</button>
                  </>
                ) : (
                  <button className="btn primary" onClick={handleCreateProduct}>Tạo sản phẩm</button>
                )}
              </div>
              <div className="filter-row">
                <div className="form-row">
                  <label>Nhóm</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Tất cả</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Tìm kiếm</label>
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Tên món, SKU" />
                </div>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Tên</span>
                  <span>SKU</span>
                  <span>Nhóm</span>
                  <span>Giá</span>
                  <span>Hành động</span>
                </div>
                {products.map(product => (
                  <div key={product.id} className="table-row five">
                    <span>
                      <span className="product-name">
                        {product.image_url && <img src={`${apiBase}${product.image_url}`} alt={product.name} />}
                        {product.name}
                      </span>
                    </span>
                    <span>{product.sku || '---'}</span>
                    <span>{categoryMap.get(product.category_id) || 'Chưa phân loại'}</span>
                    <strong>
                      {formatVnd(product.price)}
                      {product.base_price != null && product.branch_price != null && (
                        <small className="muted-text">Gốc {formatVnd(product.base_price)}</small>
                      )}
                    </strong>
                    <div className="row-actions">
                      <button className="btn ghost" onClick={() => handleEditProduct(product)}>Sửa</button>
                      <button className="btn ghost" onClick={() => handleDeleteProduct(product)}>Xoá</button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <div className="empty">Chưa có sản phẩm.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'inventory' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Phân loại kho</h3>
                <span>{inventoryCategories.length} nhóm</span>
              </div>
              <div className="form-row">
                <label>Tên nhóm</label>
                <input value={inventoryCategoryName} onChange={(e) => setInventoryCategoryName(e.target.value)} placeholder="Nguyên liệu, vật dụng..." />
              </div>
              <button className="btn primary" onClick={handleCreateInventoryCategory}>Tạo phân loại</button>
              <div className="list">
                {inventoryCategories.map(cat => (
                  <div key={cat.id} className="list-item">
                    <div>
                      <h4>{cat.name}</h4>
                      <p>{cat.id}</p>
                    </div>
                    <strong>Nhóm</strong>
                  </div>
                ))}
                {inventoryCategories.length === 0 && <div className="empty">Chưa có phân loại kho.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Nguyên liệu & phân loại</h3>
                <span>{ingredients.length} nguyên liệu</span>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Tên</span>
                  <span>Đơn vị</span>
                  <span>Phân loại</span>
                  <span></span>
                </div>
                {ingredients.map(ing => (
                  <div key={ing.id} className="table-row">
                    <span>{ing.name}</span>
                    <span>{ing.unit || '---'}</span>
                    <select
                      value={ing.category_id || ''}
                      onChange={(e) => handleUpdateIngredientCategory(ing.id, e.target.value)}
                    >
                      <option value="">Chưa phân loại</option>
                      {inventoryCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <span></span>
                  </div>
                ))}
                {ingredients.length === 0 && <div className="empty">Chưa có nguyên liệu.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Phiếu kiểm kê</h3>
                <span>{stocktakeItems.length} dòng</span>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Nguyên liệu</label>
                  <select value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)}>
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Số lượng thực tế</label>
                  <input value={actualQty} onChange={(e) => setActualQty(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={handleAddStocktakeItem}>Thêm dòng</button>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Nguyên liệu</span>
                  <span>Thực tế</span>
                  <span>Hành động</span>
                  <span></span>
                </div>
                {stocktakeItems.map(item => (
                  <div key={item.ingredient_id} className="table-row">
                    <span>{item.name}</span>
                    <span>{item.actual_qty}</span>
                    <button className="btn ghost" onClick={() => setStocktakeItems(prev => prev.filter(row => row.ingredient_id !== item.ingredient_id))}>Xoá</button>
                    <span></span>
                  </div>
                ))}
                {stocktakeItems.length === 0 && <div className="empty">Chưa có dòng kiểm kê.</div>}
              </div>
              <div className="form-row">
                <label>Ghi chú</label>
                <input value={stocktakeNote} onChange={(e) => setStocktakeNote(e.target.value)} placeholder="Ghi chú kiểm kê" />
              </div>
              <button className="btn primary" onClick={handleCreateStocktake}>Tạo phiếu kiểm kê</button>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Danh sách kiểm kê</h3>
                <span>{stocktakes.length} phiếu</span>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Mã phiếu</span>
                  <span>Trạng thái</span>
                  <span>Ngày</span>
                  <span>Hành động</span>
                </div>
                {stocktakes.slice(0, 8).map(item => (
                  <div key={item.id} className="table-row">
                    <span>{item.id}</span>
                    <span>{item.status}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    <div className="row-actions">
                      {item.status === 'DRAFT' ? (
                        <button className="btn ghost" onClick={() => handleApproveStocktake(item.id)}>Duyệt</button>
                      ) : (
                        <span className="muted-text">Đã duyệt</span>
                      )}
                    </div>
                  </div>
                ))}
                {stocktakes.length === 0 && <div className="empty">Chưa có phiếu kiểm kê.</div>}
              </div>
            </div>
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
              <h3>Nhập kho nguyên liệu</h3>
              <div className="form-grid">
                <div className="form-row">
                  <label>Ingredient ID</label>
                  <input value={inputForm.ingredient_id} onChange={(e) => setInputForm({ ...inputForm, ingredient_id: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Số lượng</label>
                  <input value={inputForm.quantity} onChange={(e) => setInputForm({ ...inputForm, quantity: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Đơn giá</label>
                  <input value={inputForm.unit_cost} onChange={(e) => setInputForm({ ...inputForm, unit_cost: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Lý do</label>
                  <input value={inputForm.reason} onChange={(e) => setInputForm({ ...inputForm, reason: e.target.value })} />
                </div>
              </div>
              <button className="btn primary" onClick={handleCreateInput}>Tạo phiếu nhập</button>
            </div>

            <div className="card">
              <h3>Danh sách nhập kho</h3>
              <div className="table">
                <div className="table-row head">
                  <span>Nguyên liệu</span>
                  <span>Số lượng</span>
                  <span>Đơn giá</span>
                  <span>Tổng</span>
                </div>
                {inventoryInputs.slice(0, 10).map(input => (
                  <div key={input.id} className="table-row">
                    <span>{input.ingredient_id}</span>
                    <span>{input.quantity}</span>
                    <span>{formatVnd(input.unit_cost || 0)}</span>
                    <strong>{formatVnd(input.total_cost || 0)}</strong>
                  </div>
                ))}
                {inventoryInputs.length === 0 && <div className="empty">Chưa có phiếu nhập kho.</div>}
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
              <div className="actions">
                <button className="btn ghost" onClick={() => downloadReport('/reports/revenue/export')}>Xuất doanh thu</button>
                <button className="btn ghost" onClick={() => downloadReport('/reports/inventory/export')}>Xuất tồn kho</button>
                <button className="btn ghost" onClick={() => downloadReport('/reports/attendance/export')}>Xuất chấm công</button>
              </div>
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
