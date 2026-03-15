import { useEffect, useMemo, useState } from 'react';
import createPosApi from '../services/posApi';

const formatReceiptPayload = ({ order, branchId, cart, total, paymentMethod }) => {
  if (order?.id) {
    return { order_id: order.id };
  }
  return {
    branch_id: branchId || null,
    items: cart.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity
    })),
    created_at: order?.created_at || new Date().toISOString(),
    total_amount: order?.total_amount || total,
    payments: order?.payments || [{ payment_method: paymentMethod }]
  };
};

export default function usePos() {
  const [apiBase, setApiBase] = useState(localStorage.getItem('apiBase') || 'http://localhost:3000');
  const [branchId, setBranchId] = useState(localStorage.getItem('branchId') || '');
  const [branches, setBranches] = useState([]);
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

  const api = useMemo(() => createPosApi(apiBase, token), [apiBase, token]);

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
        const data = await api.createOrder(item.payload, item.id);
        updated[i] = { ...item, status: 'synced', order_id: data.id };
        saveQueue(updated);
      } catch {
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
  const branchNameMap = useMemo(() => branches.reduce((acc, branch) => {
    acc[branch.id] = branch.name || branch.code || branch.id;
    return acc;
  }, {}), [branches]);
  const tableNameMap = useMemo(() => tables.reduce((acc, table) => {
    acc[table.id] = table.name || table.id;
    return acc;
  }, {}), [tables]);

  const loadPrinters = async () => {
    if (!window?.electron?.printers?.list) return;
    try {
      const list = await window.electron.printers.list();
      setPrinters(list || []);
    } catch {
      setPrinters([]);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const printReceipt = async (order) => {
    if (!window?.electron?.printers?.print) {
      setStatusMessage('Thieu ket noi may in Bluetooth.');
      return;
    }
    try {
      const payload = formatReceiptPayload({ order, branchId, cart, total, paymentMethod });
      const data = await api.formatReceipt(payload);
      await window.electron.printers.print({ html: data.html || '', deviceName: printerName || undefined });
      setStatusMessage('Da gui lenh in hoa don.');
    } catch {
      setStatusMessage('Khong the in hoa don.');
    }
  };

  const refreshProducts = async () => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      if (categoryId) params.category_id = categoryId;
      if (search) params.q = search;
      const data = await api.getProducts(params);
      setProducts(data);
    } catch (err) {
      if (err?.status === 403) {
        setStatusMessage('Khong co quyen xem mon theo chi nhanh. Vui long chon chi nhanh khac.');
        setBranchId('');
        localStorage.setItem('branchId', '');
      }
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const refreshCategories = async () => {
    if (!token) return;
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  const refreshIngredients = async () => {
    if (!token) return;
    try {
      const data = await api.getIngredients();
      setIngredients(data);
    } catch {
      setIngredients([]);
    }
  };

  const refreshBranches = async () => {
    if (!token) return;
    try {
      const data = await api.getBranches();
      setBranches(data || []);
      if (!branchId && data?.length === 1) {
        setBranchId(data[0].id);
        localStorage.setItem('branchId', data[0].id);
      }
    } catch {
      setBranches([]);
    }
  };

  const refreshTables = async () => {
    if (!token) return;
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      const data = await api.getTables(params);
      setTables(data || []);
    } catch (err) {
      if (err?.status === 403) {
        setStatusMessage('Khong co quyen xem ban cho chi nhanh nay. Vui long chon chi nhanh khac.');
        setBranchId('');
        localStorage.setItem('branchId', '');
      }
      setTables([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    api.getMe()
      .then(data => {
        setUser(data);
        const allowed = Array.isArray(data?.branches) ? data.branches : [];
        if (allowed.length) {
          if (!branchId || !allowed.includes(branchId)) {
            setBranchId(allowed[0]);
            localStorage.setItem('branchId', allowed[0]);
          }
          return;
        }
        if (!branchId && data?.employee?.branch_id) {
          setBranchId(data.employee.branch_id);
          localStorage.setItem('branchId', data.employee.branch_id);
        }
      })
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
    refreshBranches();
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
        const data = await api.getInventoryInputs({ branch_id: branchId });
        setInventoryInputs(data);
      } catch {
        setInventoryInputs([]);
      }
    };
    fetchInputs();
    return () => controller.abort();
  }, [apiBase, branchId, token]);

  const refreshInputs = async () => {
    if (!token || !branchId) return;
    try {
      const data = await api.getInventoryInputs({ branch_id: branchId });
      setInventoryInputs(data);
    } catch {
      setInventoryInputs([]);
    }
  };

  const fetchOpenOrders = async () => {
    if (!token || !branchId) return;
    setLoadingOrders(true);
    try {
      const data = await api.getOpenOrders({ branch_id: branchId, status: 'OPEN' });
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
      const data = await api.getOrder(orderId);
      setCurrentOrderId(data.id);
      setCart((data.items || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: item.name,
        price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      })));
      setStatusMessage(`Dang chinh phieu: ${data.id}`);
    } catch {
      setStatusMessage('Khong the tai phieu.');
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
        await api.addOrderItem(currentOrderId, {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: Number(product.price || 0)
        });
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Khong the them mon vao phieu.');
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
        await api.updateOrderItem(currentOrderId, id, { quantity: nextQty });
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Khong the cap nhat so luong.');
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
        await api.deleteOrderItem(currentOrderId, id);
        await loadOrder(currentOrderId);
      } catch {
        setStatusMessage('Khong the xoa mon khoi phieu.');
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
      const data = await api.login(loginForm);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('apiBase', apiBase);
      setToken(data.access_token);
      setShowLogin(false);
    } catch {
      setStatusMessage('Dang nhap that bai. Kiem tra tai khoan hoac API Base.');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.old_password || !passwordForm.new_password) {
      setStatusMessage('Can mat khau cu va mat khau moi.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setStatusMessage('Xac nhan mat khau moi khong khop.');
      return;
    }
    try {
      await api.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setStatusMessage('Da doi mat khau.');
    } catch {
      setStatusMessage('Khong the doi mat khau.');
    }
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setStatusMessage('Can chon ban cho don tai cho.');
      return;
    }
    if (currentOrderId) {
      try {
        setStatusMessage('Dang thanh toan...');
        await api.createPayment(currentOrderId, { amount: total, payment_method: paymentMethod });
        await api.closeOrder(currentOrderId);
        const orderData = await api.getOrder(currentOrderId);
        setLastOrder(orderData);
        if (orderData) printReceipt(orderData);
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Da thanh toan: ${currentOrderId}`);
        fetchOpenOrders();
      } catch {
        setStatusMessage('Khong the thanh toan phieu.');
      }
      return;
    }
    setStatusMessage('Dang tao don...');
    const payload = {
      branch_id: branchId,
      order_type: orderType,
      table_id: orderType === 'DINE_IN' ? selectedTableId : null,
      items: cart.map(item => ({
        product_id: item.product_id || (String(item.id).startsWith('p-') ? null : item.id),
        name: item.name,
        unit_price: item.price,
        quantity: item.quantity
      }))
    };
    if (!isOnline) {
      enqueueOrder(payload);
      clearOrder();
      setShowPayment(false);
      setStatusMessage('Dang offline: don da vao hang doi.');
      return;
    }
    try {
      const idempotencyKey = crypto.randomUUID();
      const data = await api.createOrder(payload, idempotencyKey);
      setLastOrder(data);
      if (payNow) {
        await api.createPayment(data.id, { amount: total, payment_method: paymentMethod });
        await api.closeOrder(data.id);
        printReceipt(data);
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Da thanh toan: ${data.id}`);
      } else {
        clearOrder();
        setShowPayment(false);
        setStatusMessage(`Da luu phieu: ${data.id}`);
      }
      fetchOpenOrders();
    } catch {
      enqueueOrder(payload);
      clearOrder();
      setShowPayment(false);
      setStatusMessage('Khong the gui ngay. Da dua vao hang doi.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt('Nhap ly do xoa phieu');
    if (!reason) return;
    try {
      await api.cancelOrder(orderId, { reason });
      if (currentOrderId === orderId) clearOrder();
      setStatusMessage('Da xoa phieu.');
      fetchOpenOrders();
    } catch {
      setStatusMessage('Khong the xoa phieu.');
    }
  };

  const handleCreateInput = async () => {
    if (!branchId) {
      setStatusMessage('Can chon chi nhanh de nhap kho.');
      return;
    }
    if (!inputForm.ingredient_id || !inputForm.quantity) {
      setStatusMessage('Can nguyen lieu va so luong.');
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
      const data = await api.createInventoryInput(payload);
      setInventoryInputs(prev => [...data.items, ...prev]);
      setInputForm({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
      setShowInputModal(false);
      setStatusMessage('Nhap kho thanh cong.');
    } catch {
      setStatusMessage('Khong the nhap kho.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
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
      setStatusMessage('Chua co don de in.');
      return;
    }
    printReceipt(lastOrder || null);
  };

  const state = {
    apiBase,
    branchId,
    branches,
    orderType,
    token,
    user,
    isOnline,
    orderQueue,
    products,
    categories,
    categoryId,
    ingredients,
    inventoryInputs,
    tables,
    selectedTableId,
    openOrders,
    currentOrderId,
    loadingOrders,
    inputForm,
    showInputModal,
    wsStatus,
    printers,
    printerName,
    lastOrder,
    loadingProducts,
    search,
    cart,
    showPayment,
    cashReceived,
    paymentMethod,
    payNow,
    statusMessage,
    showLogin,
    loginForm,
    passwordForm
  };

  const actions = {
    setApiBase,
    setBranchId,
    setBranches,
    setOrderType,
    setToken,
    setUser,
    setCategoryId,
    setSearch,
    setSelectedTableId,
    setShowPayment,
    setCashReceived,
    setPaymentMethod,
    setPayNow,
    setShowLogin,
    setLoginForm,
    setPasswordForm,
    setInputForm,
    setShowInputModal,
    setPrinterName,
    setStatusMessage,
    setCart,
    setCurrentOrderId,
    setInventoryInputs,
    setTableBranchId: setSelectedTableId,
    processQueue,
    refreshProducts,
    refreshCategories,
    refreshIngredients,
    refreshBranches,
    refreshTables,
    refreshInputs,
    fetchOpenOrders,
    loadOrder,
    addToCart,
    updateQty,
    removeItem,
    clearOrder,
    handleLogin,
    handleChangePassword,
    handleCreateOrder,
    handleCancelOrder,
    handleCreateInput,
    handleLogout,
    persistSettings,
    handlePrintLast,
    loadPrinters,
    printReceipt
  };

  const derived = {
    total,
    changeDue,
    branchNameMap,
    tableNameMap,
    queuePendingCount: orderQueue.filter(item => item.status !== 'synced').length
  };

  return { state, actions, derived };
}
