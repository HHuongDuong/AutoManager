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

const fallbackProducts = [
  { id: 'p-1', name: 'Cà phê sữa', price: 29000 },
  { id: 'p-2', name: 'Bạc xỉu', price: 32000 },
  { id: 'p-3', name: 'Trà đào', price: 35000 },
  { id: 'p-4', name: 'Matcha latte', price: 42000 }
];

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const [apiBase, setApiBase] = useState('http://localhost:3000');
  const [token, setToken] = useState('');
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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
      if (savedBase) setApiBase(savedBase);
      if (savedToken) setToken(savedToken);
      if (savedBranch) setBranchId(savedBranch);
      if (savedEmployee) setEmployeeId(savedEmployee);
      setShowLogin(!savedToken);
    };
    loadSettings();
  }, []);

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
        const filtered = fallbackProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        setProducts(filtered);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [apiBase, branchId, search, token]);

  const persistSetting = async (key, value) => {
    await AsyncStorage.setItem(key, value);
  };

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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('order_failed');
      setCart([]);
      setCashReceived('0');
      setShowPayment(false);
      setStatusMessage('Tạo đơn thành công.');
    } catch (err) {
      setStatusMessage('Không thể tạo đơn.');
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
