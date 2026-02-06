import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-thermal-receipt-printer';
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const defaultApiBase = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
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

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const changeDue = Math.max(0, Number(cashReceived || 0) - total);
  const tableNameMap = useMemo(() => tables.reduce((acc, table) => {
    acc[table.id] = table.name || table.id;
    return acc;
  }, {}), [tables]);
  const availableTables = useMemo(() => tables.filter(table => !table.status || table.status === 'AVAILABLE'), [tables]);
  const branchNameMap = useMemo(() => branches.reduce((acc, branch) => {
    acc[branch.id] = branch.name || branch.code || branch.id;
    return acc;
  }, {}), [branches]);

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
        const params = new URLSearchParams();
        if (branchId) params.set('branch_id', branchId);
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
    fetchProducts();
  }, [apiBase, branchId, search, token]);

  useEffect(() => {
    if (!token) return;
    const fetchIngredients = async () => {
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
    fetchIngredients();
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${apiBase}/branches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        setBranches(data || []);
        await AsyncStorage.setItem('branches', JSON.stringify(data || []));
      } catch (err) {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    const fetchMe = async () => {
      try {
        const res = await fetch(`${apiBase}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('me_failed');
        const data = await res.json();
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
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    const fetchShifts = async () => {
      try {
        const res = await fetch(`${apiBase}/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        setShifts(data || []);
      } catch (err) {
        setShifts([]);
      }
    };
    fetchShifts();
  }, [apiBase, token]);

  useEffect(() => {
    if (!token || !branchId) return;
    const fetchInputs = async () => {
      try {
        const params = new URLSearchParams();
        params.set('branch_id', branchId);
        const res = await fetch(`${apiBase}/inventory/inputs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('fetch_failed');
        const data = await res.json();
        setInventoryInputs(data);
      } catch (err) {
        setInventoryInputs([]);
      }
    };
    fetchInputs();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (!token) return;
    const fetchTables = async () => {
      try {
        const params = new URLSearchParams();
        if (branchId) params.set('branch_id', branchId);
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
    fetchTables();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (orderType !== 'DINE_IN') setSelectedTableId('');
  }, [orderType]);

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

  useEffect(() => {
    refreshInputs();
  }, [apiBase, branchId, token]);

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

  const persistSetting = async (key, value) => {
    await AsyncStorage.setItem(key, value);
  };

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
      await BluetoothEscposPrinter.printText(data.text || '', { encoding: 'GBK' });
      setStatusMessage('Đã gửi lệnh in hóa đơn.');
    } catch (err) {
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
        await saveQueue(updated);
      } catch (err) {
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
  }, [apiBase, token, orderQueue]);

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
      const res = await fetch(`${apiBase}/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employee_id: employeeId, shift_id: autoShiftId, ...location })
      });
      if (!res.ok) throw new Error('checkin_failed');
      const data = await res.json();
      setShiftId(autoShiftId);
      if (data?.check_in_status) {
        setStatusMessage(`Check-in ${data.check_in_status === 'EARLY' ? 'sớm' : 'muộn'} (${data.check_in_diff_minutes} phút).`);
      } else {
        setStatusMessage('Check-in thành công.');
      }
    } catch (err) {
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
      const res = await fetch(`${apiBase}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employee_id: employeeId, ...location })
      });
      if (!res.ok) throw new Error('checkout_failed');
      const data = await res.json();
      if (data?.check_out_status) {
        setStatusMessage(`Check-out ${data.check_out_status === 'EARLY' ? 'sớm' : 'muộn'} (${data.check_out_diff_minutes} phút).`);
      } else {
        setStatusMessage('Check-out thành công.');
      }
    } catch (err) {
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
      const res = await fetch(`${apiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': makeId()
        },
        body: JSON.stringify(payload)
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
      setStatusMessage('Tạo đơn thành công.');
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      const isNetworkError = message.includes('network request failed') || message.includes('failed to fetch');
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
      setStatusMessage('Nhập kho thành công.');
    } catch (err) {
      setStatusMessage('Không thể nhập kho.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {token ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.brand}>AutoManager</Text>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowLogin(true)}>
              <Text style={styles.ghostText}>{token ? 'Cài đặt' : 'Đăng nhập'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.moduleTabs}>
            {[{ key: 'checkin', label: 'Check-in/out' }, { key: 'order', label: 'Bán hàng' }, { key: 'inventory', label: 'Nhập kho' }].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[styles.moduleTab, activeModule === item.key && styles.moduleTabActive]}
                onPress={() => setActiveModule(item.key)}
              >
                <Text style={activeModule === item.key ? styles.moduleTabTextActive : styles.moduleTabText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeModule === 'checkin' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Thiết lập nhanh</Text>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>API Base</Text>
                    <TextInput
                      style={styles.input}
                      value={apiBase}
                      onChangeText={(value) => { setApiBase(value); persistSetting('apiBase', value); }}
                      placeholder="http://localhost:3000"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Chi nhánh</Text>
                    <Text style={styles.muted}>{branchNameMap[branchId] || branchId || 'Chưa chọn'}</Text>
                    {branches.length > 0 ? (
                      <View style={styles.productList}>
                        {branches.map(branch => (
                          <TouchableOpacity
                            key={branch.id}
                            style={styles.productCard}
                            onPress={() => {
                              setBranchId(branch.id);
                              persistSetting('branchId', branch.id);
                            }}
                          >
                            <View>
                              <Text style={styles.productName}>{branch.name || branch.code || branch.id}</Text>
                              <Text style={styles.productPrice}>{branch.address || branch.location || branch.id}</Text>
                            </View>
                            <Text style={styles.addBtn}>Chọn</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        value={branchId}
                        onChangeText={(value) => { setBranchId(value); persistSetting('branchId', value); }}
                        placeholder="branch_id"
                      />
                    )}
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Máy in Bluetooth</Text>
                    <Text style={styles.muted}>Trạng thái: {bluetoothConnected ? 'Đã kết nối' : 'Chưa kết nối'}</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.outlineBtn} onPress={scanBluetooth}>
                        <Text style={styles.outlineText}>Quét thiết bị</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.outlineBtn} onPress={disconnectBluetooth}>
                        <Text style={styles.outlineText}>Ngắt kết nối</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Địa chỉ máy in Bluetooth</Text>
                    <TextInput
                      style={styles.input}
                      value={printerTarget}
                      onChangeText={(value) => { setPrinterTarget(value); persistSetting('printerTarget', value); }}
                      placeholder="00:11:22:33:44:55"
                    />
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => connectBluetooth(printerTarget)}>
                      <Text style={styles.primaryText}>Kết nối</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {bluetoothDevices.length > 0 && (
                  <View style={styles.row}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Thiết bị đã ghép đôi</Text>
                      <View style={styles.productList}>
                        {bluetoothDevices.map(device => (
                          <TouchableOpacity
                            key={device.address}
                            style={styles.productCard}
                            onPress={() => {
                              setPrinterTarget(device.address);
                              persistSetting('printerTarget', device.address);
                              connectBluetooth(device.address);
                            }}
                          >
                            <View>
                              <Text style={styles.productName}>{device.name || 'Bluetooth Printer'}</Text>
                              <Text style={styles.productPrice}>{device.address}</Text>
                            </View>
                            <Text style={styles.addBtn}>Kết nối</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                <View style={styles.row}>
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => printReceipt(null, cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    subtotal: item.price * item.quantity
                  })))}>
                    <Text style={styles.outlineText}>In thử</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Employee ID</Text>
                    <TextInput
                      style={styles.input}
                      value={employeeId}
                      onChangeText={(value) => { setEmployeeId(value); persistSetting('employeeId', value); }}
                      placeholder="employee_id"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Ca làm</Text>
                    <Text style={styles.muted}>Tự động theo giờ hiện tại</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleCheckIn}>
                    <Text style={styles.primaryText}>Check-in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineBtn} onPress={handleCheckOut}>
                    <Text style={styles.outlineText}>Check-out</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.outlineBtn} onPress={processQueue}>
                    <Text style={styles.outlineText}>Đồng bộ ({orderQueue.filter(i => i.status !== 'synced').length})</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.muted}>Realtime: {wsStatus}</Text>
              </View>
            </>
          )}

          {activeModule === 'order' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>POS Order</Text>
                <View style={styles.segmented}>
                  {['DINE_IN', 'TAKE_AWAY'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.segment, orderType === type && styles.segmentActive]}
                    onPress={() => setOrderType(type)}
                  >
                    <Text style={orderType === type ? styles.segmentTextActive : styles.segmentText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {orderType === 'DINE_IN' && (
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Chọn bàn</Text>
                    <TouchableOpacity style={styles.dropdownInput} onPress={() => setShowTablePicker(true)}>
                      <Text style={styles.dropdownText}>{tableNameMap[selectedTableId] || 'Chưa chọn'}</Text>
                      <Text style={styles.dropdownCaret}>▼</Text>
                    </TouchableOpacity>
                    {availableTables.length === 0 && (
                      <Text style={styles.muted}>Chưa có bàn trống.</Text>
                    )}
                  </View>
                </View>
              )}
              <TextInput
                style={styles.input}
                placeholder="Tìm món..."
                value={search}
                onChangeText={setSearch}
              />
              {loadingProducts ? (
                <ActivityIndicator />
              ) : (
                <View style={styles.productList}>
                  {products.map(product => (
                    <TouchableOpacity key={product.id || product.name} style={styles.productCard} onPress={() => addToCart(product)}>
                      <View>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>{formatVnd(product.price)}</Text>
                      </View>
                      <Text style={styles.addBtn}>+ Thêm</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Giỏ hàng</Text>
              {cart.length === 0 && <Text style={styles.muted}>Chưa có món trong giỏ.</Text>}
              {cart.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <View>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.muted}>{formatVnd(item.price)}</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                      <Text>-</Text>
                    </TouchableOpacity>
                    <Text>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                      <Text>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text>Tổng cộng</Text>
                <Text style={styles.totalValue}>{formatVnd(total)}</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPayment(true)}>
                <Text style={styles.primaryText}>Thanh toán</Text>
              </TouchableOpacity>
            </View>
            </>
          )}

          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

          {activeModule === 'inventory' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nhập kho nguyên liệu</Text>
              <Text style={styles.label}>Ingredient ID</Text>
              <TextInput
                style={styles.input}
                value={inputForm.ingredient_id}
                onChangeText={(value) => setInputForm({ ...inputForm, ingredient_id: value })}
                placeholder="ingredient_id"
              />
              {ingredients.length > 0 && (
                <Text style={styles.muted}>Gợi ý: {ingredients.slice(0, 3).map(i => i.name).join(', ')}</Text>
              )}
              <Text style={styles.label}>Số lượng</Text>
              <TextInput
                style={styles.input}
                value={inputForm.quantity}
                onChangeText={(value) => setInputForm({ ...inputForm, quantity: value })}
                placeholder="quantity"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Đơn giá</Text>
              <TextInput
                style={styles.input}
                value={inputForm.unit_cost}
                onChangeText={(value) => setInputForm({ ...inputForm, unit_cost: value })}
                placeholder="unit_cost"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Lý do</Text>
              <TextInput
                style={styles.input}
                value={inputForm.reason}
                onChangeText={(value) => setInputForm({ ...inputForm, reason: value })}
                placeholder="reason"
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateInput}>
                <Text style={styles.primaryText}>Tạo phiếu nhập</Text>
              </TouchableOpacity>
              {inventoryInputs.slice(0, 5).map(input => (
                <View key={input.id} style={styles.cartRow}>
                  <View>
                    <Text style={styles.productName}>{input.ingredient_id}</Text>
                    <Text style={styles.muted}>{input.quantity} • {formatVnd(input.unit_cost || 0)}</Text>
                  </View>
                  <Text style={styles.totalValue}>{formatVnd(input.total_cost || 0)}</Text>
                </View>
              ))}
              {inventoryInputs.length === 0 && <Text style={styles.muted}>Chưa có phiếu nhập kho.</Text>}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.loginOnly}>
          <Text style={styles.cardTitle}>Vui lòng đăng nhập</Text>
          <Text style={styles.muted}>Bạn cần đăng nhập để sử dụng ứng dụng.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
            <Text style={styles.primaryText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showPayment} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Thanh toán</Text>
            <Text style={styles.muted}>Tổng: {formatVnd(total)}</Text>
            <TextInput
              style={styles.input}
              value={cashReceived}
              onChangeText={setCashReceived}
              placeholder="Khách đưa"
              keyboardType="numeric"
            />
            <Text style={styles.muted}>Tiền thối: {formatVnd(changeDue)}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.segment} onPress={() => setPayNow(v => !v)}>
                <Text>{payNow ? 'Thanh toán ngay' : 'Thanh toán sau'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPayment(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateOrder}>
              <Text style={styles.primaryText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTablePicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Chọn bàn</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {availableTables.map(table => (
                <TouchableOpacity
                  key={table.id}
                  style={styles.productCard}
                  onPress={() => {
                    setSelectedTableId(table.id);
                    setShowTablePicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.productName}>{table.name}</Text>
                    <Text style={styles.productPrice}>{table.status}</Text>
                  </View>
                  <Text style={styles.addBtn}>Chọn</Text>
                </TouchableOpacity>
              ))}
              {availableTables.length === 0 && (
                <Text style={styles.muted}>Chưa có bàn trống.</Text>
              )}
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowTablePicker(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogin} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Cài đặt & Đăng nhập</Text>
            <TextInput
              style={styles.input}
              value={apiBase}
              onChangeText={(value) => { setApiBase(value); persistSetting('apiBase', value); }}
              placeholder="API Base"
            />
            <Text style={styles.label}>Chi nhánh</Text>
            <Text style={styles.muted}>{branchNameMap[branchId] || branchId || 'Chưa chọn'}</Text>
            {branches.length > 0 ? (
              <View style={styles.productList}>
                {branches.map(branch => (
                  <TouchableOpacity
                    key={branch.id}
                    style={styles.productCard}
                    onPress={() => {
                      setBranchId(branch.id);
                      persistSetting('branchId', branch.id);
                    }}
                  >
                    <View>
                      <Text style={styles.productName}>{branch.name || branch.code || branch.id}</Text>
                      <Text style={styles.productPrice}>{branch.address || branch.location || branch.id}</Text>
                    </View>
                    <Text style={styles.addBtn}>Chọn</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={branchId}
                onChangeText={(value) => { setBranchId(value); persistSetting('branchId', value); }}
                placeholder="branch_id"
              />
            )}
            <TextInput
              style={styles.input}
              value={loginForm.username}
              onChangeText={(value) => setLoginForm({ ...loginForm, username: value })}
              placeholder="Username"
            />
            <TextInput
              style={styles.input}
              value={loginForm.password}
              onChangeText={(value) => setLoginForm({ ...loginForm, password: value })}
              placeholder="Password"
              secureTextEntry
            />
            {token && (
              <>
                <TextInput
                  style={styles.input}
                  value={passwordForm.old_password}
                  onChangeText={(value) => setPasswordForm({ ...passwordForm, old_password: value })}
                  placeholder="Mật khẩu cũ"
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  value={passwordForm.new_password}
                  onChangeText={(value) => setPasswordForm({ ...passwordForm, new_password: value })}
                  placeholder="Mật khẩu mới"
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirm_password}
                  onChangeText={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })}
                  placeholder="Xác nhận mật khẩu mới"
                  secureTextEntry
                />
              </>
            )}
            <View style={styles.row}>
              {token && (
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowLogin(false)}>
                  <Text style={styles.outlineText}>Đóng</Text>
                </TouchableOpacity>
              )}
              {token && (
                <TouchableOpacity style={styles.outlineBtn} onPress={handleLogout}>
                  <Text style={styles.outlineText}>Đăng xuất</Text>
                </TouchableOpacity>
              )}
              {token && (
                <TouchableOpacity style={styles.outlineBtn} onPress={handleChangePassword}>
                  <Text style={styles.outlineText}>Đổi mật khẩu</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
                <Text style={styles.primaryText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
            {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb'
  },
  loginOnly: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12
  },
  scroll: {
    padding: 20,
    gap: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  label: {
    fontSize: 12,
    color: '#64748b'
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  dropdownText: {
    color: '#0f172a'
  },
  dropdownCaret: {
    color: '#64748b'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  field: {
    flex: 1,
    gap: 6
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  outlineText: {
    color: '#0f172a'
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  ghostText: {
    color: '#0f172a'
  },
  moduleTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  moduleTab: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff'
  },
  moduleTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8'
  },
  moduleTabText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600'
  },
  moduleTabTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  segment: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  segmentActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8'
  },
  segmentText: {
    color: '#0f172a',
    fontSize: 12
  },
  segmentTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  productList: {
    gap: 10
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  productName: {
    color: '#0f172a',
    fontWeight: '600'
  },
  productPrice: {
    color: '#64748b',
    fontSize: 12
  },
  addBtn: {
    color: '#2563eb',
    fontWeight: '600'
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  totalValue: {
    color: '#2563eb',
    fontWeight: '700'
  },
  muted: {
    color: '#64748b'
  },
  status: {
    color: '#2563eb',
    textAlign: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  }
});
