import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothEscposPrinter, BluetoothManager } from 'react-native-thermal-receipt-printer';
import { createMobileApi } from '../services/mobileApi';

const defaultApiBase = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

export default function useMobileAppState() {
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [printerTarget, setPrinterTarget] = useState('');
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [token, setToken] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [orderQueue, setOrderQueue] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [inventoryInputs, setInventoryInputs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [openOrders, setOpenOrders] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [inputForm, setInputForm] = useState({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [cashReceived, setCashReceived] = useState('0');
  const [payNow, setPayNow] = useState(true);
  const [activeModule, setActiveModule] = useState('order');
  const [showTablePicker, setShowTablePicker] = useState(false);

  const api = useMemo(() => createMobileApi(apiBase, token), [apiBase, token]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const changeDue = Math.max(0, Number(cashReceived || 0) - total);
  const tableNameMap = useMemo(
    () => tables.reduce((acc, table) => {
      acc[table.id] = table.name || table.id;
      return acc;
    }, {}),
    [tables]
  );
  const availableTables = useMemo(
    () => tables.filter(table => !table.status || table.status === 'AVAILABLE'),
    [tables]
  );
  const branchNameMap = useMemo(
    () => branches.reduce((acc, branch) => {
      acc[branch.id] = branch.name || branch.code || branch.id;
      return acc;
    }, {}),
    [branches]
  );

  const persistSetting = async (key, value) => {
    await AsyncStorage.setItem(key, value);
  };

  const updateApiBase = async (value) => {
    setApiBase(value);
    await persistSetting('apiBase', value);
  };

  const updateBranchId = async (value) => {
    setBranchId(value);
    await persistSetting('branchId', value);
  };

  const updatePrinterTarget = async (value) => {
    setPrinterTarget(value);
    await persistSetting('printerTarget', value);
  };

  const updateEmployeeId = async (value) => {
    setEmployeeId(value);
    await persistSetting('employeeId', value);
  };

  const getDeviceLocation = () => new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('geolocation_unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });

  const pickShiftIdByTime = () => {
    if (!shifts.length) return '';
    const now = new Date();
    const toMinutes = (timeStr) => {
      const [h, m] = String(timeStr).split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let selected = shifts.find(shift => {
      const start = toMinutes(shift.start_time);
      const end = toMinutes(shift.end_time);
      return nowMin >= start && nowMin <= end;
    });
    if (selected) return selected.id;
    selected = shifts
      .map(shift => ({ shift, diff: Math.abs(nowMin - toMinutes(shift.start_time)) }))
      .sort((a, b) => a.diff - b.diff)[0]?.shift;
    return selected?.id || '';
  };

  useEffect(() => {
    const loadSettings = async () => {
      const savedBase = await AsyncStorage.getItem('apiBase');
      const savedToken = await AsyncStorage.getItem('token');
      const savedBranch = await AsyncStorage.getItem('branchId');
      const savedEmployee = await AsyncStorage.getItem('employeeId');
      const savedQueue = await AsyncStorage.getItem('orderQueue');
      const savedPrinterTarget = await AsyncStorage.getItem('printerTarget');
      const savedBranches = await AsyncStorage.getItem('branches');
      if (savedBase) setApiBase(savedBase);
      if (savedToken) setToken(savedToken);
      if (savedBranch) setBranchId(savedBranch);
      if (savedEmployee) setEmployeeId(savedEmployee);
      if (savedPrinterTarget) setPrinterTarget(savedPrinterTarget);
      if (savedBranches) {
        try {
          setBranches(JSON.parse(savedBranches) || []);
        } catch {
          setBranches([]);
        }
      }
      if (savedQueue) {
        try {
          setOrderQueue(JSON.parse(savedQueue));
        } catch {
          setOrderQueue([]);
        }
      }
      setShowLogin(!savedToken);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!token) setShowLogin(true);
  }, [token]);

  useEffect(() => {
    if (!printerTarget) return;
    connectBluetooth(printerTarget);
  }, [printerTarget]);

  useEffect(() => {
    if (!token) return;
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const data = await api.getJson({
          path: '/products',
          params: { branch_id: branchId, q: search }
        });
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [api, branchId, search, token]);

  useEffect(() => {
    if (!token) return;
    const fetchIngredients = async () => {
      try {
        const data = await api.getJson({ path: '/ingredients' });
        setIngredients(data);
      } catch {
        setIngredients([]);
      }
    };
    fetchIngredients();
  }, [api, token]);

  const fetchOpenOrders = async () => {
    if (!token || !branchId) return;
    setLoadingOrders(true);
    try {
      const data = await api.getJson({
        path: '/orders',
        params: { branch_id: branchId, status: 'OPEN' }
      });
      setOpenOrders(data || []);
    } catch {
      setOpenOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadOrder = async (orderId) => {
    if (!token || !orderId) return;
    try {
      const res = await api.request({ path: `/orders/${orderId}` });
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setCurrentOrderId(data.id);
      setCart((data.items || []).map(item => ({
        id: item.product_id || `p-${item.id}`,
        order_item_id: item.id,
        name: item.name,
        price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 1)
      })));
      if (data.table_id) setSelectedTableId(data.table_id);
      setPayNow(true);
      setStatusMessage(`Đang sửa đơn ${data.id}`);
    } catch {
      setStatusMessage('Không thể tải đơn.');
    }
  };

  const clearCurrentOrder = () => {
    setCurrentOrderId('');
    setCart([]);
    setSelectedTableId('');
    setCashReceived('0');
  };

  useEffect(() => {
    if (!token) return;
    const fetchBranches = async () => {
      try {
        const data = await api.getJson({ path: '/branches' });
        setBranches(data || []);
        await AsyncStorage.setItem('branches', JSON.stringify(data || []));
      } catch {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [api, token]);

  useEffect(() => {
    if (!token) return;
    const fetchMe = async () => {
      try {
        const data = await api.getJson({ path: '/me' });
        const empId = data?.employee?.id || '';
        if (empId) {
          setEmployeeId(empId);
          await AsyncStorage.setItem('employeeId', empId);
        }
      } catch {
        // ignore
      }
    };
    fetchMe();
  }, [api, token]);

  useEffect(() => {
    if (!token) return;
    const fetchShifts = async () => {
      try {
        const data = await api.getJson({ path: '/shifts' });
        setShifts(data || []);
      } catch {
        setShifts([]);
      }
    };
    fetchShifts();
  }, [api, token]);

  const refreshInputs = async () => {
    if (!token || !branchId) return;
    try {
      const data = await api.getJson({
        path: '/inventory/inputs',
        params: { branch_id: branchId }
      });
      setInventoryInputs(data);
    } catch {
      setInventoryInputs([]);
    }
  };

  useEffect(() => {
    refreshInputs();
  }, [api, branchId, token]);

  useEffect(() => {
    fetchOpenOrders();
  }, [api, branchId, token]);

  useEffect(() => {
    if (!token) return;
    const fetchTables = async () => {
      try {
        const data = await api.getJson({
          path: '/tables',
          params: { branch_id: branchId }
        });
        setTables(data || []);
      } catch {
        setTables([]);
      }
    };
    fetchTables();
  }, [api, branchId, token]);

  useEffect(() => {
    if (orderType !== 'DINE_IN') setSelectedTableId('');
  }, [orderType]);

  useEffect(() => {
    if (!token) return undefined;
    const wsUrl = apiBase.replace('https', 'wss').replace('http', 'ws');
    const url = `${wsUrl}/ws?token=${encodeURIComponent(token)}${branchId ? `&branch_id=${encodeURIComponent(branchId)}` : ''}`;
    const ws = new WebSocket(url);
    setWsStatus('connecting');
    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data || '{}');
        if (msg.event?.startsWith('inventory.input')) refreshInputs();
        if (msg.event?.startsWith('order.')) setStatusMessage(`Realtime: ${msg.event}`);
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [apiBase, branchId, token]);

  const scanBluetooth = async () => {
    try {
      const devices = await BluetoothManager.enableBluetooth();
      const list = (devices || []).map((device) => {
        const parts = String(device).split('#');
        return { name: parts[0] || 'Unknown', address: parts[1] || parts[0] };
      });
      setBluetoothDevices(list);
    } catch {
      setBluetoothDevices([]);
      setStatusMessage('Không thể bật Bluetooth.');
    }
  };

  const connectBluetooth = async (address) => {
    if (!address) return;
    try {
      await BluetoothManager.connect(address);
      setBluetoothConnected(true);
      setStatusMessage('Đã kết nối máy in Bluetooth.');
    } catch {
      setBluetoothConnected(false);
      setStatusMessage('Không thể kết nối máy in.');
    }
  };

  const disconnectBluetooth = async () => {
    try {
      await BluetoothManager.disconnect();
      setBluetoothConnected(false);
      setStatusMessage('Đã ngắt kết nối máy in.');
    } catch {
      setStatusMessage('Không thể ngắt kết nối máy in.');
    }
  };

  const printReceipt = async (order, itemsOverride) => {
    try {
      if (printerTarget && !bluetoothConnected) {
        await connectBluetooth(printerTarget);
      }
      const payload = order?.id
        ? { order_id: order.id }
        : {
          branch_id: branchId || null,
          items: itemsOverride || order?.items || [],
          created_at: order?.created_at || new Date().toISOString(),
          total_amount: order?.total_amount || null,
          payments: order?.payments || []
        };
      const res = await api.request({
        path: '/receipts/format',
        method: 'POST',
        body: payload
      });
      if (!res.ok) throw new Error('receipt_failed');
      const data = await res.json();
      await BluetoothEscposPrinter.printText(data.text || '', { encoding: 'GBK' });
      setStatusMessage('Đã gửi lệnh in hóa đơn.');
    } catch {
      setStatusMessage('Không thể in hóa đơn.');
    }
  };

  const makeId = () => `q_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const saveQueue = async (nextQueue) => {
    setOrderQueue(nextQueue);
    await AsyncStorage.setItem('orderQueue', JSON.stringify(nextQueue));
  };

  const enqueueOrder = async (payload) => {
    const item = {
      id: makeId(),
      payload,
      status: 'queued',
      retries: 0,
      next_retry_at: Date.now()
    };
    await saveQueue([item, ...orderQueue]);
  };

  const processQueue = async () => {
    if (!token || orderQueue.length === 0) return;
    const now = Date.now();
    const updated = [...orderQueue];
    for (let i = 0; i < updated.length; i += 1) {
      const item = updated[i];
      if (item.status === 'synced') continue;
      if (item.next_retry_at && item.next_retry_at > now) continue;
      updated[i] = { ...item, status: 'sending' };
      await saveQueue(updated);
      try {
        const res = await api.request({
          path: '/orders',
          method: 'POST',
          body: item.payload,
          idempotencyKey: item.id
        });
        if (!res.ok) throw new Error('order_failed');
        const data = await res.json();
        updated[i] = { ...item, status: 'synced', order_id: data.id };
        await saveQueue(updated);
      } catch {
        const retries = (item.retries || 0) + 1;
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, retries));
        updated[i] = {
          ...item,
          status: 'failed',
          retries,
          next_retry_at: Date.now() + backoffMs
        };
        await saveQueue(updated);
      }
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    const timer = setInterval(processQueue, 5000);
    return () => clearInterval(timer);
  }, [api, token, orderQueue]);

  const addToCart = async (product) => {
    if (currentOrderId) {
      try {
        const res = await api.request({
          path: `/orders/${currentOrderId}/items`,
          method: 'POST',
          body: {
            product_id: product.id,
            name: product.name,
            quantity: 1,
            unit_price: product.price
          }
        });
        if (!res.ok) throw new Error('order_item_add_failed');
        const data = await res.json();
        setCart(prev => [...prev, {
          id: product.id,
          order_item_id: data.id,
          name: product.name,
          price: Number(product.price || 0),
          quantity: 1
        }]);
        return;
      } catch {
        setStatusMessage('Không thể thêm món vào đơn.');
        return;
      }
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        quantity: 1
      }];
    });
  };

  const updateQty = async (id, delta) => {
    if (currentOrderId) {
      const target = cart.find(item => item.id === id);
      if (!target) return;
      const nextQty = target.quantity + delta;
      if (!target.order_item_id) return;
      try {
        if (nextQty <= 0) {
          const res = await api.request({
            path: `/orders/${currentOrderId}/items/${target.order_item_id}`,
            method: 'DELETE'
          });
          if (!res.ok) throw new Error('delete_failed');
          setCart(prev => prev.filter(item => item.id !== id));
          return;
        }
        const res = await api.request({
          path: `/orders/${currentOrderId}/items/${target.order_item_id}`,
          method: 'PATCH',
          body: { quantity: nextQty }
        });
        if (!res.ok) throw new Error('update_failed');
        setCart(prev => prev.map(item => item.id === id
          ? { ...item, quantity: nextQty }
          : item));
      } catch {
        setStatusMessage('Không thể cập nhật số lượng.');
      }
      return;
    }
    setCart(prev => prev
      .map(item => item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item)
      .filter(item => item.quantity > 0)
    );
  };

  const handlePayOrder = async () => {
    if (!currentOrderId) return;
    try {
      const amount = total;
      const res = await api.request({
        path: `/orders/${currentOrderId}/payments`,
        method: 'POST',
        body: { amount, payment_method: 'CASH' }
      });
      if (!res.ok) throw new Error('payment_failed');
      await api.request({
        path: `/orders/${currentOrderId}/close`,
        method: 'POST'
      });
      clearCurrentOrder();
      setShowPayment(false);
      setStatusMessage('Đã thanh toán đơn.');
      fetchOpenOrders();
    } catch (err) {
      setStatusMessage(`Không thể thanh toán: ${err?.message || 'Lỗi máy chủ.'}`);
    }
  };

  const handleLogin = async () => {
    setStatusMessage('');
    let base = String(apiBase || '').trim().replace(/\/+$/, '');
    if (Platform.OS === 'android' && /localhost|127\.0\.0\.1/.test(base)) {
      base = base.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
    if (!base) {
      setStatusMessage('Cần API Base hợp lệ.');
      return;
    }
    if (!loginForm.username || !loginForm.password) {
      setStatusMessage('Cần username và password.');
      return;
    }
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.detail || data?.message || data?.error || '';
        } catch {
          try {
            detail = await res.text();
          } catch {
            detail = '';
          }
        }
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      await AsyncStorage.setItem('token', data.access_token);
      await persistSetting('apiBase', base);
      setApiBase(base);
      setToken(data.access_token);
      setShowLogin(false);
    } catch (err) {
      console.warn('Login failed', err);
      setStatusMessage(`Đăng nhập thất bại: ${err?.message || 'Kiểm tra tài khoản hoặc API Base.'}`);
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
      const res = await api.request({
        path: '/users/me/password',
        method: 'POST',
        body: {
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password
        }
      });
      if (!res.ok) throw new Error('password_failed');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setStatusMessage('Đã đổi mật khẩu.');
    } catch {
      setStatusMessage('Không thể đổi mật khẩu.');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    setToken('');
    setShowLogin(true);
  };

  const handleCheckIn = async () => {
    if (!employeeId) {
      setStatusMessage('Cần employee_id để check-in.');
      return;
    }
    const autoShiftId = pickShiftIdByTime();
    if (!autoShiftId) {
      setStatusMessage('Không tìm thấy ca làm phù hợp.');
      return;
    }
    try {
      const location = await getDeviceLocation();
      const res = await api.request({
        path: '/attendance/checkin',
        method: 'POST',
        body: { employee_id: employeeId, shift_id: autoShiftId, ...location }
      });
      if (!res.ok) throw new Error('checkin_failed');
      const data = await res.json();
      setShiftId(autoShiftId);
      if (data?.check_in_status) {
        setStatusMessage(`Check-in ${data.check_in_status === 'EARLY' ? 'sớm' : 'muộn'} (${data.check_in_diff_minutes} phút).`);
      } else {
        setStatusMessage('Check-in thành công.');
      }
    } catch {
      setStatusMessage('Không thể check-in.');
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) {
      setStatusMessage('Cần employee_id để check-out.');
      return;
    }
    try {
      const location = await getDeviceLocation();
      const res = await api.request({
        path: '/attendance/checkout',
        method: 'POST',
        body: { employee_id: employeeId, ...location }
      });
      if (!res.ok) throw new Error('checkout_failed');
      const data = await res.json();
      if (data?.check_out_status) {
        setStatusMessage(`Check-out ${data.check_out_status === 'EARLY' ? 'sớm' : 'muộn'} (${data.check_out_diff_minutes} phút).`);
      } else {
        setStatusMessage('Check-out thành công.');
      }
    } catch {
      setStatusMessage('Không thể check-out.');
    }
  };

  const handleCreateOrder = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn chi nhánh để tạo đơn.');
      return;
    }
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setStatusMessage('Cần chọn bàn cho đơn tại chỗ.');
      return;
    }
    if (cart.length === 0) {
      setStatusMessage('Chưa có món trong giỏ.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        order_type: orderType,
        table_id: orderType === 'DINE_IN' ? selectedTableId : null,
        items: cart.map(item => ({
          product_id: item.id.startsWith('p-') ? null : item.id,
          name: item.name,
          unit_price: item.price,
          quantity: item.quantity
        })),
        payments: payNow ? [{ amount: total, payment_method: 'CASH' }] : []
      };
      const res = await api.request({
        path: '/orders',
        method: 'POST',
        body: payload,
        idempotencyKey: makeId()
      });
      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.error || data?.message || data?.detail || '';
        } catch {
          try {
            detail = await res.text();
          } catch {
            detail = '';
          }
        }
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (payNow) {
        await printReceipt(data, payload.items);
      }
      setCart([]);
      setCashReceived('0');
      setShowPayment(false);
      setSelectedTableId('');
      setStatusMessage(payNow ? 'Tạo đơn thành công.' : 'Đã lưu đơn thanh toán sau.');
      fetchOpenOrders();
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      const isNetworkError = message.includes('network request failed')
        || message.includes('failed to fetch');
      if (isNetworkError) {
        const payload = {
          branch_id: branchId,
          order_type: orderType,
          table_id: orderType === 'DINE_IN' ? selectedTableId : null,
          items: cart.map(item => ({
            product_id: item.id.startsWith('p-') ? null : item.id,
            name: item.name,
            unit_price: item.price,
            quantity: item.quantity
          })),
          payments: payNow ? [{ amount: total, payment_method: 'CASH' }] : []
        };
        await enqueueOrder(payload);
        setCart([]);
        setCashReceived('0');
        setShowPayment(false);
        setSelectedTableId('');
        setStatusMessage('Đang offline: đơn đã vào hàng đợi.');
        return;
      }
      setStatusMessage(`Không thể tạo đơn: ${err?.message || 'Lỗi máy chủ.'}`);
    }
  };

  const handleCreateInput = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn chi nhánh để nhập kho.');
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
      const res = await api.request({
        path: '/inventory/inputs',
        method: 'POST',
        body: payload
      });
      if (!res.ok) throw new Error('input_failed');
      const data = await res.json();
      setInventoryInputs(prev => [...data.items, ...prev]);
      setInputForm({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
      setStatusMessage('Nhập kho thành công.');
    } catch {
      setStatusMessage('Không thể nhập kho.');
    }
  };

  return {
    apiBase,
    setApiBase,
    updateApiBase,
    printerTarget,
    setPrinterTarget,
    updatePrinterTarget,
    bluetoothDevices,
    bluetoothConnected,
    token,
    branchId,
    updateBranchId,
    branches,
    employeeId,
    updateEmployeeId,
    shiftId,
    orderType,
    setOrderType,
    loginForm,
    setLoginForm,
    showLogin,
    setShowLogin,
    statusMessage,
    passwordForm,
    setPasswordForm,
    orderQueue,
    ingredients,
    inventoryInputs,
    shifts,
    tables,
    selectedTableId,
    setSelectedTableId,
    openOrders,
    currentOrderId,
    loadingOrders,
    inputForm,
    setInputForm,
    wsStatus,
    products,
    search,
    setSearch,
    loadingProducts,
    cart,
    showPayment,
    setShowPayment,
    cashReceived,
    setCashReceived,
    payNow,
    setPayNow,
    activeModule,
    setActiveModule,
    showTablePicker,
    setShowTablePicker,
    total,
    changeDue,
    tableNameMap,
    availableTables,
    branchNameMap,
    fetchOpenOrders,
    loadOrder,
    clearCurrentOrder,
    refreshInputs,
    scanBluetooth,
    connectBluetooth,
    disconnectBluetooth,
    printReceipt,
    enqueueOrder,
    processQueue,
    addToCart,
    updateQty,
    handlePayOrder,
    handleLogin,
    handleChangePassword,
    handleLogout,
    handleCheckIn,
    handleCheckOut,
    handleCreateOrder,
    handleCreateInput
  };
}
