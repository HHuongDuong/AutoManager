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
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-thermal-receipt-printer';
const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const [apiBase, setApiBase] = useState('http://localhost:3000');
  const [printerTarget, setPrinterTarget] = useState('');
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [token, setToken] = useState('');
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [orderQueue, setOrderQueue] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [inventoryInputs, setInventoryInputs] = useState([]);
  const [inputForm, setInputForm] = useState({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [cashReceived, setCashReceived] = useState('0');
  const [payNow, setPayNow] = useState(true);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const changeDue = Math.max(0, Number(cashReceived || 0) - total);

  useEffect(() => {
    const loadSettings = async () => {
      const savedBase = await AsyncStorage.getItem('apiBase');
      const savedToken = await AsyncStorage.getItem('token');
      const savedBranch = await AsyncStorage.getItem('branchId');
      const savedEmployee = await AsyncStorage.getItem('employeeId');
      const savedQueue = await AsyncStorage.getItem('orderQueue');
      const savedPrinterTarget = await AsyncStorage.getItem('printerTarget');
      if (savedBase) setApiBase(savedBase);
      if (savedToken) setToken(savedToken);
      if (savedBranch) setBranchId(savedBranch);
      if (savedEmployee) setEmployeeId(savedEmployee);
      if (savedPrinterTarget) setPrinterTarget(savedPrinterTarget);
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
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!res.ok) throw new Error('login_failed');
      const data = await res.json();
      await AsyncStorage.setItem('token', data.access_token);
      await persistSetting('apiBase', apiBase);
      setToken(data.access_token);
      setShowLogin(false);
    } catch (err) {
      setStatusMessage('Đăng nhập thất bại. Kiểm tra tài khoản hoặc API Base.');
    }
  };

  const handleCheckIn = async () => {
    if (!employeeId || !shiftId) {
      setStatusMessage('Cần employee_id và shift_id để check-in.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employee_id: employeeId, shift_id: shiftId })
      });
      if (!res.ok) throw new Error('checkin_failed');
      setStatusMessage('Check-in thành công.');
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
      const res = await fetch(`${apiBase}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employee_id: employeeId })
      });
      if (!res.ok) throw new Error('checkout_failed');
      setStatusMessage('Check-out thành công.');
    } catch (err) {
      setStatusMessage('Không thể check-out.');
    }
  };

  const handleCreateOrder = async () => {
    if (!branchId) {
      setStatusMessage('Cần branch_id để tạo đơn.');
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
      if (!res.ok) throw new Error('order_failed');
      const data = await res.json();
      if (payNow) {
        await printReceipt(data, payload.items);
      }
      setCart([]);
      setCashReceived('0');
      setShowPayment(false);
      setStatusMessage('Tạo đơn thành công.');
    } catch (err) {
      const payload = {
        branch_id: branchId,
        order_type: orderType,
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
      setStatusMessage('Đang offline: đơn đã vào hàng đợi.');
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
      setStatusMessage('Nhập kho thành công.');
    } catch (err) {
      setStatusMessage('Không thể nhập kho.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brand}>AutoManager</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowLogin(true)}>
            <Text style={styles.ghostText}>{token ? 'Cài đặt' : 'Đăng nhập'}</Text>
          </TouchableOpacity>
        </View>

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
              <Text style={styles.label}>Branch ID</Text>
              <TextInput
                style={styles.input}
                value={branchId}
                onChangeText={(value) => { setBranchId(value); persistSetting('branchId', value); }}
                placeholder="branch_id"
              />
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
              <Text style={styles.label}>Shift ID</Text>
              <TextInput
                style={styles.input}
                value={shiftId}
                onChangeText={(value) => setShiftId(value)}
                placeholder="shift_id"
              />
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>POS Order</Text>
          <View style={styles.segmented}>
            {['DINE_IN', 'TAKE_AWAY', 'DELIVERY'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.segment, orderType === type && styles.segmentActive]}
                onPress={() => setOrderType(type)}
              >
                <Text style={orderType === type ? styles.segmentTextActive : styles.segmentText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

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
      </ScrollView>

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

      <Modal visible={showLogin} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Đăng nhập</Text>
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
            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowLogin(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
                <Text style={styles.primaryText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
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
    color: '#e2e8f0'
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    gap: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  label: {
    fontSize: 12,
    color: '#94a3b8'
  },
  input: {
    backgroundColor: '#0b1220',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#1f2937'
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
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  primaryText: {
    color: '#052e16',
    fontWeight: '700'
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  outlineText: {
    color: '#e2e8f0'
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  ghostText: {
    color: '#e2e8f0'
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  segment: {
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  segmentActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8'
  },
  segmentText: {
    color: '#e2e8f0',
    fontSize: 12
  },
  segmentTextActive: {
    color: '#e2e8f0',
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
    backgroundColor: '#0b1220',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  productName: {
    color: '#e2e8f0',
    fontWeight: '600'
  },
  productPrice: {
    color: '#94a3b8',
    fontSize: 12
  },
  addBtn: {
    color: '#38bdf8',
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
    borderColor: '#1f2937',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 10
  },
  totalValue: {
    color: '#22c55e',
    fontWeight: '700'
  },
  muted: {
    color: '#94a3b8'
  },
  status: {
    color: '#38bdf8',
    textAlign: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    gap: 12
  }
});
