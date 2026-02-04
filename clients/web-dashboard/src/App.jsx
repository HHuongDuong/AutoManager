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
  { id: 'branches', label: 'Chi nhánh' },
  { id: 'rbac', label: 'Phân quyền' },
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
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });

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
  const [shifts, setShifts] = useState([]);
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '', end_time: '' });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchForm, setBranchForm] = useState({ id: '', name: '', address: '', latitude: '', longitude: '' });
  const [tables, setTables] = useState([]);
  const [tableForm, setTableForm] = useState({ id: '', name: '', status: 'AVAILABLE' });
  const [tableBranchId, setTableBranchId] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({ employee_id: '', from: '', to: '' });
  const [employeeForm, setEmployeeForm] = useState({
    id: '',
    user_id: '',
    username: '',
    password: '',
    full_name: '',
    phone: '',
    position: '',
    branch_id: ''
  });
  const [roleSelections, setRoleSelections] = useState({});
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [rolePermissions, setRolePermissions] = useState({});
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
  const [issueForm, setIssueForm] = useState({ ingredient_id: '', quantity: '', reason: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ ingredient_id: '', quantity: '', reason: '' });

  const totalRevenueToday = useMemo(() => {
    if (!revenue.length) return 0;
    const latest = revenue[revenue.length - 1];
    return Number(latest.revenue || 0);
  }, [revenue]);

  const orderCount = useMemo(() => orders.length, [orders]);
  const categoryMap = useMemo(() => new Map(categories.map(cat => [cat.id, cat.name])), [categories]);
  const branchNameMap = useMemo(() => new Map(branches.map(branch => [branch.id, branch.name])), [branches]);
  const ingredientMap = useMemo(() => new Map(ingredients.map(ing => [ing.id, ing.name])), [ingredients]);
  const assignedPermissionIds = useMemo(
    () => new Set((rolePermissions[selectedRoleId] || []).map(perm => perm.id)),
    [rolePermissions, selectedRoleId]
  );

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

  const refreshEmployees = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      const url = params.toString() ? `${apiBase}/employees?${params.toString()}` : `${apiBase}/employees`;
      const res = await fetch(url, { headers });
      const data = res.ok ? await res.json() : [];
      setEmployees(data);
    } catch {
      setEmployees([]);
    }
  };

  const refreshShifts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/shifts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setShifts(data);
    } catch {
      setShifts([]);
    }
  };

  const refreshBranches = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setBranches(data);
    } catch {
      setBranches([]);
    }
  };

  const refreshTables = async (branchIdValue) => {
    if (!token || !branchIdValue) {
      setTables([]);
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('branch_id', branchIdValue);
      const res = await fetch(`${apiBase}/tables?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setTables(data);
    } catch {
      setTables([]);
    }
  };

  const fetchAttendanceLogs = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      if (attendanceFilters.employee_id) params.set('employee_id', attendanceFilters.employee_id);
      if (attendanceFilters.from) params.set('from', attendanceFilters.from);
      if (attendanceFilters.to) params.set('to', attendanceFilters.to);
      const res = await fetch(`${apiBase}/attendance/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setAttendanceLogs(data);
    } catch {
      setAttendanceLogs([]);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/rbac/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setRoles(data);
    } catch {
      setRoles([]);
    }
  };

  const fetchPermissions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/rbac/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setPermissions(data);
    } catch {
      setPermissions([]);
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      id: '',
      user_id: '',
      username: '',
      password: '',
      full_name: '',
      phone: '',
      position: '',
      branch_id: branchId || ''
    });
  };

  const handleSaveEmployee = async () => {
    if (!token) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      if (employeeForm.id) {
        const res = await fetch(`${apiBase}/employees/${employeeForm.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            full_name: employeeForm.full_name || null,
            phone: employeeForm.phone || null,
            position: employeeForm.position || null,
            branch_id: employeeForm.branch_id || null
          })
        });
        if (!res.ok) throw new Error('update_failed');
        setStatusMessage('Đã cập nhật nhân viên.');
      } else {
        if (!employeeForm.username || !employeeForm.password) {
          setStatusMessage('Cần username và password để tạo nhân viên.');
          return;
        }
        const res = await fetch(`${apiBase}/employees`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            username: employeeForm.username,
            password: employeeForm.password,
            full_name: employeeForm.full_name || null,
            phone: employeeForm.phone || null,
            position: employeeForm.position || null,
            branch_id: employeeForm.branch_id || null
          })
        });
        if (!res.ok) throw new Error('create_failed');
        setStatusMessage('Đã tạo nhân viên.');
      }
      resetEmployeeForm();
      refreshEmployees();
    } catch {
      setStatusMessage('Không thể lưu nhân viên.');
    }
  };

  const handleEditEmployee = (emp) => {
    setEmployeeForm({
      id: emp.id || '',
      user_id: emp.user_id || '',
      username: emp.username || '',
      password: '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      position: emp.position || '',
      branch_id: emp.branch_id || ''
    });
  };

  const handleDeleteEmployee = async (emp) => {
    if (!token || !emp?.id) return;
    if (!window.confirm(`Xóa nhân viên ${emp.full_name || emp.username || emp.id}?`)) return;
    try {
      const res = await fetch(`${apiBase}/employees/${emp.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('delete_failed');
      setStatusMessage('Đã xóa nhân viên.');
      refreshEmployees();
    } catch {
      setStatusMessage('Không thể xóa nhân viên.');
    }
  };

  const handleToggleUserStatus = async (emp) => {
    if (!token || !emp?.user_id) return;
    try {
      const res = await fetch(`${apiBase}/users/${emp.user_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !emp.is_active })
      });
      if (!res.ok) throw new Error('status_failed');
      setStatusMessage('Đã cập nhật trạng thái tài khoản.');
      refreshEmployees();
    } catch {
      setStatusMessage('Không thể cập nhật trạng thái.');
    }
  };

  const handleAssignRole = async (emp) => {
    if (!token || !emp?.user_id) return;
    const roleId = roleSelections[emp.user_id];
    if (!roleId) {
      setStatusMessage('Chọn role trước khi gán.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/rbac/users/${emp.user_id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role_id: roleId })
      });
      if (!res.ok) throw new Error('role_failed');
      setStatusMessage('Đã gán vai trò.');
    } catch {
      setStatusMessage('Không thể gán vai trò.');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setStatusMessage('Cần tên role.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/rbac/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      if (!res.ok) throw new Error('role_failed');
      setNewRoleName('');
      fetchRoles();
      setStatusMessage('Đã tạo role.');
    } catch {
      setStatusMessage('Không thể tạo role.');
    }
  };

  const handleToggleRolePermission = async (permissionId, isChecked) => {
    if (!selectedRoleId) {
      setStatusMessage('Chọn role trước khi gán quyền.');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (isChecked) {
        const res = await fetch(`${apiBase}/rbac/roles/${selectedRoleId}/permissions`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission_id: permissionId })
        });
        if (!res.ok) throw new Error('assign_failed');
      } else {
        const res = await fetch(`${apiBase}/rbac/roles/${selectedRoleId}/permissions/${permissionId}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) throw new Error('remove_failed');
      }
      fetchRolePermissions(selectedRoleId);
      setStatusMessage(isChecked ? 'Đã gán quyền cho role.' : 'Đã bỏ gán quyền.');
    } catch {
      setStatusMessage('Không thể cập nhật quyền cho role.');
    }
  };

  const handleCreateShift = async () => {
    if (!shiftForm.name || !shiftForm.start_time || !shiftForm.end_time) {
      setStatusMessage('Cần tên ca, giờ bắt đầu và giờ kết thúc.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: shiftForm.name,
          start_time: shiftForm.start_time,
          end_time: shiftForm.end_time
        })
      });
      if (!res.ok) throw new Error('shift_failed');
      setShiftForm({ name: '', start_time: '', end_time: '' });
      setStatusMessage('Đã tạo ca làm.');
      refreshShifts();
    } catch {
      setStatusMessage('Không thể tạo ca làm.');
    }
  };

  const handleEditBranch = (branch) => {
    setBranchForm({
      id: branch.id,
      name: branch.name || '',
      address: branch.address || '',
      latitude: branch.latitude ?? '',
      longitude: branch.longitude ?? ''
    });
  };

  const handleUpdateBranchLocation = async () => {
    if (!branchForm.id) {
      setStatusMessage('Chọn chi nhánh để cập nhật.');
      return;
    }
    if (branchForm.latitude === '' || branchForm.longitude === '') {
      setStatusMessage('Cần tọa độ latitude và longitude.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/branches/${branchForm.id}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: Number(branchForm.latitude),
          longitude: Number(branchForm.longitude)
        })
      });
      if (!res.ok) throw new Error('branch_update_failed');
      setStatusMessage('Đã cập nhật tọa độ chi nhánh.');
      refreshBranches();
    } catch {
      setStatusMessage('Không thể cập nhật tọa độ chi nhánh.');
    }
  };

  const handleCreateBranch = async () => {
    if (!branchForm.name.trim()) {
      setStatusMessage('Cần tên chi nhánh.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: branchForm.name.trim(), address: branchForm.address || null })
      });
      if (!res.ok) throw new Error('branch_create_failed');
      setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' });
      setStatusMessage('Đã tạo chi nhánh.');
      refreshBranches();
    } catch {
      setStatusMessage('Không thể tạo chi nhánh.');
    }
  };

  const handleUpdateBranchInfo = async () => {
    if (!branchForm.id) {
      setStatusMessage('Chọn chi nhánh để cập nhật.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/branches/${branchForm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: branchForm.name || null, address: branchForm.address || null })
      });
      if (!res.ok) throw new Error('branch_update_failed');
      setStatusMessage('Đã cập nhật thông tin chi nhánh.');
      refreshBranches();
    } catch {
      setStatusMessage('Không thể cập nhật chi nhánh.');
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (!branch?.id) return;
    if (!window.confirm(`Xóa chi nhánh ${branch.name}?`)) return;
    try {
      const res = await fetch(`${apiBase}/branches/${branch.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('branch_delete_failed');
      setStatusMessage('Đã xóa chi nhánh.');
      refreshBranches();
    } catch {
      setStatusMessage('Không thể xóa chi nhánh.');
    }
  };

  const handleCreateTable = async () => {
    if (!tableBranchId) {
      setStatusMessage('Chọn chi nhánh để tạo bàn.');
      return;
    }
    if (!tableForm.name.trim()) {
      setStatusMessage('Cần tên bàn.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ branch_id: tableBranchId, name: tableForm.name.trim(), status: tableForm.status })
      });
      if (!res.ok) throw new Error('table_create_failed');
      setTableForm({ id: '', name: '', status: 'AVAILABLE' });
      setStatusMessage('Đã tạo bàn.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Không thể tạo bàn.');
    }
  };

  const handleEditTable = (table) => {
    setTableForm({ id: table.id, name: table.name || '', status: table.status || 'AVAILABLE' });
  };

  const handleUpdateTable = async () => {
    if (!tableForm.id) return;
    try {
      const res = await fetch(`${apiBase}/tables/${tableForm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: tableForm.name || null, status: tableForm.status || null })
      });
      if (!res.ok) throw new Error('table_update_failed');
      setTableForm({ id: '', name: '', status: 'AVAILABLE' });
      setStatusMessage('Đã cập nhật bàn.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Không thể cập nhật bàn.');
    }
  };

  const handleDeleteTable = async (table) => {
    if (!table?.id) return;
    if (!window.confirm(`Xóa ${table.name}?`)) return;
    try {
      const res = await fetch(`${apiBase}/tables/${table.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('table_delete_failed');
      setStatusMessage('Đã xóa bàn.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Không thể xóa bàn.');
    }
  };

  const fetchRolePermissions = async (roleId) => {
    if (!token || !roleId) return;
    try {
      const res = await fetch(`${apiBase}/rbac/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setRolePermissions(prev => ({ ...prev, [roleId]: data }));
    } catch {
      setRolePermissions(prev => ({ ...prev, [roleId]: [] }));
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [apiBase, branchId, token]);

  useEffect(() => {
    if (!token) setShowLogin(true);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setBranches([]);
      return;
    }
    refreshBranches();
  }, [token, apiBase]);

  useEffect(() => {
    if (activeNav !== 'menu') return;
    fetchMenuData();
  }, [activeNav, apiBase, branchId, categoryId, productSearch, token]);

  useEffect(() => {
    if (activeNav !== 'inventory') return;
    fetchInventoryMeta();
  }, [activeNav, apiBase, branchId, token]);

  useEffect(() => {
    if (activeNav !== 'hr') return;
    fetchRoles();
    refreshEmployees();
    refreshShifts();
    fetchAttendanceLogs();
    if (!employeeForm.id && !employeeForm.branch_id) {
      setEmployeeForm(prev => ({ ...prev, branch_id: branchId || '' }));
    }
  }, [activeNav, apiBase, branchId, token]);

  useEffect(() => {
    if (activeNav !== 'rbac') return;
    fetchRoles();
    fetchPermissions();
  }, [activeNav, apiBase, token]);

  useEffect(() => {
    if (activeNav !== 'branches') return;
    refreshBranches();
  }, [activeNav, apiBase, token]);

  useEffect(() => {
    if (activeNav !== 'branches') return;
    if (!tableBranchId && branches.length) {
      setTableBranchId(branches[0].id);
    }
  }, [activeNav, branches]);

  useEffect(() => {
    if (activeNav !== 'branches') return;
    refreshTables(tableBranchId);
  }, [activeNav, tableBranchId, apiBase, token]);

  useEffect(() => {
    if (!selectedRoleId) return;
    fetchRolePermissions(selectedRoleId);
  }, [selectedRoleId]);

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
        if (msg.event?.startsWith('employee.') || msg.event?.startsWith('user.status.')) refreshEmployees();
        if (msg.event?.startsWith('branch.')) refreshBranches();
        if (msg.event?.startsWith('table.')) refreshTables(tableBranchId);
        if (msg.event?.startsWith('attendance.')) fetchAttendanceLogs();
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
      setAiSuggest([]);
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

  const handleCreateIssue = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn branch_id để xuất kho.');
      return;
    }
    if (!issueForm.ingredient_id || issueForm.quantity === '') {
      setStatusMessage('Cần ingredient_id và số lượng.');
      return;
    }
    const qty = Number(issueForm.quantity || 0);
    if (qty === 0) {
      setStatusMessage('Số lượng phải khác 0.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        reason: issueForm.reason || null,
        items: [{ ingredient_id: issueForm.ingredient_id, quantity: qty }]
      };
      const res = await fetch(`${apiBase}/inventory/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('issue_failed');
      setIssueForm({ ingredient_id: '', quantity: '', reason: '' });
      setStatusMessage('Đã tạo phiếu xuất kho.');
      fetchData();
    } catch (err) {
      setStatusMessage('Không thể tạo phiếu xuất kho.');
    }
  };

  const handleCreateAdjustment = async () => {
    if (!branchId) {
      setStatusMessage('Cần chọn branch_id để điều chỉnh tồn.');
      return;
    }
    if (!adjustmentForm.ingredient_id || adjustmentForm.quantity === '') {
      setStatusMessage('Cần ingredient_id và số lượng.');
      return;
    }
    const qty = Number(adjustmentForm.quantity || 0);
    if (qty === 0) {
      setStatusMessage('Số lượng phải khác 0.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        reason: adjustmentForm.reason || null,
        items: [{ ingredient_id: adjustmentForm.ingredient_id, quantity: qty }]
      };
      const res = await fetch(`${apiBase}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('adjust_failed');
      setAdjustmentForm({ ingredient_id: '', quantity: '', reason: '' });
      setStatusMessage('Đã tạo phiếu điều chỉnh.');
      fetchData();
    } catch (err) {
      setStatusMessage('Không thể tạo phiếu điều chỉnh.');
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
      {token ? (
        <>
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
                <strong>{branchNameMap.get(branchId) || 'Chưa chọn'}</strong>
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
                <h3>Chi nhánh đang chọn</h3>
              </div>
              <div className="form-row">
                <label>Chi nhánh</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    persistSettings();
                  }}
                  disabled={!branches.length}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                {!branches.length && <small className="hint">Cần tải danh sách chi nhánh trước.</small>}
              </div>
            </div>
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
                    <span>{ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
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
                  <select value={inputForm.ingredient_id} onChange={(e) => setInputForm({ ...inputForm, ingredient_id: e.target.value })}>
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
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
              <h3>Xuất kho nguyên liệu</h3>
              <div className="form-grid">
                <div className="form-row">
                  <label>Ingredient ID</label>
                  <select value={issueForm.ingredient_id} onChange={(e) => setIssueForm({ ...issueForm, ingredient_id: e.target.value })}>
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Số lượng</label>
                  <input value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Lý do</label>
                  <input value={issueForm.reason} onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })} />
                </div>
              </div>
              <button className="btn primary" onClick={handleCreateIssue}>Tạo phiếu xuất</button>
              <div className="table">
                <div className="table-row head">
                  <span>Nguyên liệu</span>
                  <span>Số lượng</span>
                  <span>Ngày</span>
                  <span></span>
                </div>
                {inventoryTx.filter(tx => tx.transaction_type === 'OUT').slice(0, 6).map(tx => (
                  <div key={tx.id} className="table-row">
                    <span>{ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
                    <span>{tx.quantity}</span>
                    <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
                    <span></span>
                  </div>
                ))}
                {inventoryTx.filter(tx => tx.transaction_type === 'OUT').length === 0 && (
                  <div className="empty">Chưa có phiếu xuất kho.</div>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Điều chỉnh tồn kho</h3>
              <div className="form-grid">
                <div className="form-row">
                  <label>Ingredient ID</label>
                  <select value={adjustmentForm.ingredient_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, ingredient_id: e.target.value })}>
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Số lượng (+/-)</label>
                  <input value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Lý do</label>
                  <input value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} />
                </div>
              </div>
              <button className="btn primary" onClick={handleCreateAdjustment}>Tạo phiếu điều chỉnh</button>
              <div className="table">
                <div className="table-row head">
                  <span>Nguyên liệu</span>
                  <span>Số lượng</span>
                  <span>Ngày</span>
                  <span></span>
                </div>
                {inventoryTx.filter(tx => tx.transaction_type === 'ADJUST').slice(0, 6).map(tx => (
                  <div key={tx.id} className="table-row">
                    <span>{ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
                    <span>{tx.quantity}</span>
                    <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
                    <span></span>
                  </div>
                ))}
                {inventoryTx.filter(tx => tx.transaction_type === 'ADJUST').length === 0 && (
                  <div className="empty">Chưa có phiếu điều chỉnh.</div>
                )}
              </div>
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
                    <span>{ingredientMap.get(input.ingredient_id) || input.ingredient_id}</span>
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
                      <h4>{ingredientMap.get(item.ingredient_id) || item.ingredient_id}</h4>
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
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Ca làm</h3>
                <span>{shifts.length} ca</span>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Tên ca</label>
                  <input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} placeholder="Ca sáng" />
                </div>
                <div className="form-row">
                  <label>Giờ bắt đầu</label>
                  <input value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} placeholder="08:00" />
                </div>
                <div className="form-row">
                  <label>Giờ kết thúc</label>
                  <input value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} placeholder="12:00" />
                </div>
              </div>
              <button className="btn primary" onClick={handleCreateShift}>Tạo ca làm</button>
              <div className="table">
                <div className="table-row head">
                  <span>Tên ca</span>
                  <span>Bắt đầu</span>
                  <span>Kết thúc</span>
                  <span></span>
                </div>
                {shifts.map(shift => (
                  <div key={shift.id} className="table-row">
                    <span>{shift.name}</span>
                    <span>{shift.start_time}</span>
                    <span>{shift.end_time}</span>
                    <span></span>
                  </div>
                ))}
                {shifts.length === 0 && <div className="empty">Chưa có ca làm.</div>}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <h3>Lịch sử chấm công</h3>
                <button className="btn ghost" onClick={fetchAttendanceLogs}>Làm mới</button>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Nhân viên</label>
                  <select value={attendanceFilters.employee_id} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, employee_id: e.target.value })}>
                    <option value="">Tất cả</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Từ ngày</label>
                  <input type="date" value={attendanceFilters.from} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, from: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Đến ngày</label>
                  <input type="date" value={attendanceFilters.to} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, to: e.target.value })} />
                </div>
              </div>
              <button className="btn primary" onClick={fetchAttendanceLogs}>Lọc</button>
              <div className="table">
                <div className="table-row head">
                  <span>Nhân viên</span>
                  <span>Ca</span>
                  <span>Check-in</span>
                  <span>Trạng thái</span>
                  <span>Check-out</span>
                  <span>Trạng thái</span>
                </div>
                {attendanceLogs.slice(0, 12).map(log => (
                  <div key={log.id} className="table-row">
                    <span>{log.full_name || log.employee_id}</span>
                    <span>{log.shift_name || log.shift_id || '---'}</span>
                    <span>{log.check_in ? new Date(log.check_in).toLocaleString('vi-VN') : '---'}</span>
                    <span>{log.check_in_status ? `${log.check_in_status} (${log.check_in_diff_minutes}m)` : '---'}</span>
                    <span>{log.check_out ? new Date(log.check_out).toLocaleString('vi-VN') : '---'}</span>
                    <span>{log.check_out_status ? `${log.check_out_status} (${log.check_out_diff_minutes}m)` : '---'}</span>
                  </div>
                ))}
                {attendanceLogs.length === 0 && <div className="empty">Chưa có dữ liệu chấm công.</div>}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <h3>{employeeForm.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h3>
                <span>{employees.length} nhân viên</span>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Họ tên</label>
                  <input
                    value={employeeForm.full_name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="form-row">
                  <label>Chức vụ</label>
                  <input
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    placeholder="Thu ngân"
                  />
                </div>
                <div className="form-row">
                  <label>Số điện thoại</label>
                  <input
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    placeholder="09xxxxxxxx"
                  />
                </div>
                <div className="form-row">
                  <label>Chi nhánh</label>
                  <select
                    value={employeeForm.branch_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, branch_id: e.target.value })}
                    disabled={!branches.length}
                  >
                    <option value="">Không gán chi nhánh</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  {!branches.length && <small className="hint">Cần tải danh sách chi nhánh trước.</small>}
                </div>
                <div className="form-row">
                  <label>Tài khoản</label>
                  <input
                    value={employeeForm.username}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                    placeholder="username"
                    disabled={Boolean(employeeForm.id)}
                  />
                </div>
                {!employeeForm.id && (
                  <div className="form-row">
                    <label>Mật khẩu</label>
                    <input
                      type="password"
                      value={employeeForm.password}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                      placeholder="********"
                    />
                  </div>
                )}
              </div>
              <div className="actions">
                <button className="btn primary" onClick={handleSaveEmployee}>
                  {employeeForm.id ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button className="btn ghost" onClick={resetEmployeeForm}>Huỷ</button>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Danh sách nhân viên</h3>
                <button className="btn ghost" onClick={refreshEmployees}>Làm mới</button>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Họ tên</span>
                  <span>Tài khoản</span>
                  <span>Chức vụ</span>
                  <span>SĐT</span>
                  <span>Chi nhánh</span>
                  <span>Trạng thái</span>
                  <span>Vai trò</span>
                  <span>Hành động</span>
                </div>
                {employees.map(emp => (
                  <div key={emp.id} className="table-row">
                    <span>{emp.full_name || emp.username}</span>
                    <span>{emp.username || emp.user_id}</span>
                    <span>{emp.position || '---'}</span>
                    <span>{emp.phone || '---'}</span>
                    <span>{branchNameMap.get(emp.branch_id) || emp.branch_id || '---'}</span>
                    <span>{emp.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span>
                    <span>
                      <div className="inline">
                        <select
                          value={roleSelections[emp.user_id] || ''}
                          onChange={(e) => setRoleSelections(prev => ({ ...prev, [emp.user_id]: e.target.value }))}
                        >
                          <option value="">Chọn role</option>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                        <button className="btn ghost" onClick={() => handleAssignRole(emp)}>Gán</button>
                      </div>
                    </span>
                    <span>
                      <div className="inline">
                        <button className="btn ghost" onClick={() => handleEditEmployee(emp)}>Sửa</button>
                        <button className="btn ghost" onClick={() => handleToggleUserStatus(emp)}>
                          {emp.is_active ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                        <button className="btn danger" onClick={() => handleDeleteEmployee(emp)}>Xóa</button>
                      </div>
                    </span>
                  </div>
                ))}
                {employees.length === 0 && <div className="empty">Chưa có dữ liệu nhân viên.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'rbac' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Vai trò (Roles)</h3>
                <span>{roles.length} role</span>
              </div>
              <div className="form-row">
                <label>Tên role</label>
                <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="VD: Thu ngân" />
              </div>
              <button className="btn primary" onClick={handleCreateRole}>Tạo role</button>
              <div className="list">
                {roles.map(role => (
                  <div key={role.id} className="list-item">
                    <div>
                      <h4>{role.name}</h4>
                      <p>{role.id}</p>
                    </div>
                    <strong>Role</strong>
                  </div>
                ))}
                {roles.length === 0 && <div className="empty">Chưa có role.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Gán quyền cho role</h3>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Role</label>
                  <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                    <option value="">Chọn role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Quyền</span>
                  <span>Mô tả</span>
                  <span>Gán</span>
                </div>
                {permissions.map(perm => (
                  <div key={perm.id} className="table-row">
                    <span>{perm.code}</span>
                    <span>{perm.description || '---'}</span>
                    <span>
                      <input
                        type="checkbox"
                        checked={assignedPermissionIds.has(perm.id)}
                        onChange={(e) => handleToggleRolePermission(perm.id, e.target.checked)}
                        disabled={!selectedRoleId}
                      />
                    </span>
                  </div>
                ))}
                {permissions.length === 0 && <div className="empty">Chưa có quyền.</div>}
                {!selectedRoleId && permissions.length > 0 && <div className="empty">Chọn role để gán quyền.</div>}
              </div>
            </div>
          </section>
        )}

        {activeNav === 'branches' && (
          <section className="grid">
            <div className="card">
              <div className="card-head">
                <h3>Danh sách chi nhánh</h3>
                <button className="btn ghost" onClick={refreshBranches}>Làm mới</button>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Tên</span>
                  <span>Địa chỉ</span>
                  <span>Lat</span>
                  <span>Lng</span>
                  <span>Hành động</span>
                </div>
                {branches.map(branch => (
                  <div key={branch.id} className="table-row">
                    <span>{branch.name}</span>
                    <span>{branch.address || '---'}</span>
                    <span>{branch.latitude ?? '---'}</span>
                    <span>{branch.longitude ?? '---'}</span>
                    <span>
                      <button className="btn ghost" onClick={() => handleEditBranch(branch)}>Sửa</button>
                      <button className="btn danger" onClick={() => handleDeleteBranch(branch)}>Xóa</button>
                    </span>
                  </div>
                ))}
                {branches.length === 0 && <div className="empty">Chưa có chi nhánh.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Thông tin chi nhánh</h3>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Chi nhánh</label>
                  <select
                    value={branchForm.id}
                    onChange={(e) => {
                      const selected = branches.find(b => b.id === e.target.value);
                      if (selected) handleEditBranch(selected);
                      else setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' });
                    }}
                  >
                    <option value="">Chọn chi nhánh</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Tên chi nhánh</label>
                  <input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="Chi nhánh 1" />
                </div>
                <div className="form-row">
                  <label>Địa chỉ</label>
                  <input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Số nhà, đường, quận" />
                </div>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={handleCreateBranch}>Tạo mới</button>
                <button className="btn ghost" onClick={handleUpdateBranchInfo} disabled={!branchForm.id}>Cập nhật</button>
                <button className="btn danger" onClick={() => handleDeleteBranch(branchForm)} disabled={!branchForm.id}>Xóa</button>
                <button className="btn ghost" onClick={() => setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' })}>Làm mới</button>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Cập nhật tọa độ chi nhánh</h3>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Chi nhánh</label>
                  <select
                    value={branchForm.id}
                    onChange={(e) => {
                      const selected = branches.find(b => b.id === e.target.value);
                      if (selected) handleEditBranch(selected);
                      else setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' });
                    }}
                  >
                    <option value="">Chọn chi nhánh</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Latitude</label>
                  <input value={branchForm.latitude} onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })} placeholder="10.123456" />
                </div>
                <div className="form-row">
                  <label>Longitude</label>
                  <input value={branchForm.longitude} onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })} placeholder="106.123456" />
                </div>
              </div>
              <button className="btn primary" onClick={handleUpdateBranchLocation}>Lưu tọa độ</button>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Danh sách bàn</h3>
                <button className="btn ghost" onClick={() => refreshTables(tableBranchId)}>Làm mới</button>
              </div>
              <div className="form-row">
                <label>Chi nhánh</label>
                <select
                  value={tableBranchId}
                  onChange={(e) => {
                    setTableBranchId(e.target.value);
                    setTableForm({ id: '', name: '', status: 'AVAILABLE' });
                  }}
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Tên bàn</span>
                  <span>Trạng thái</span>
                  <span>Hành động</span>
                </div>
                {tables.map(table => (
                  <div key={table.id} className="table-row">
                    <span>{table.name}</span>
                    <span>{table.status}</span>
                    <span>
                      <button className="btn ghost" onClick={() => handleEditTable(table)}>Sửa</button>
                      <button className="btn danger" onClick={() => handleDeleteTable(table)}>Xóa</button>
                    </span>
                  </div>
                ))}
                {tables.length === 0 && <div className="empty">Chưa có bàn.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Tạo/Cập nhật bàn</h3>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Tên bàn</label>
                  <input value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} placeholder="Bàn 1" />
                </div>
                <div className="form-row">
                  <label>Trạng thái</label>
                  <select value={tableForm.status} onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                  </select>
                </div>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={handleCreateTable}>Tạo mới</button>
                <button className="btn ghost" onClick={handleUpdateTable} disabled={!tableForm.id}>Cập nhật</button>
                <button className="btn ghost" onClick={() => setTableForm({ id: '', name: '', status: 'AVAILABLE' })}>Làm mới</button>
              </div>
            </div>
          </section>
        )}

        {activeNav === 'reports' && (
          <section className="grid">
            <div className="card">
              <div className="form-row">
                <label>Chi nhánh</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    persistSettings();
                  }}
                  disabled={!branches.length}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                {!branches.length && <small className="hint">Cần tải danh sách chi nhánh trước.</small>}
              </div>
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
        </>
      ) : (
        <main className="content">
          <section className="grid single">
            <div className="card">
              <h3>Vui lòng đăng nhập</h3>
              <p>Bạn cần đăng nhập để truy cập nội dung hệ thống.</p>
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
                  <select
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      persistSettings();
                    }}
                    disabled={!branches.length}
                  >
                    <option value="">Tất cả chi nhánh</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  {!branches.length && <small className="hint">Cần đăng nhập và có quyền để tải danh sách chi nhánh.</small>}
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
              {statusMessage && <div className="status">{statusMessage}</div>}
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
