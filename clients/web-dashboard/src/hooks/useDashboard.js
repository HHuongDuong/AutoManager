import { useEffect, useMemo, useState } from 'react';
import createDashboardApi from '../services/dashboardApi';

export default function useDashboard() {
  const [apiBase, setApiBase] = useState(localStorage.getItem('apiBase') || 'http://localhost:3000');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [branchId, setBranchId] = useState(localStorage.getItem('branchId') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLogin, setShowLogin] = useState(!token);
  const [showChangePassword, setShowChangePassword] = useState(false);
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
  const [ingredientForm, setIngredientForm] = useState({ name: '', unit: '', category_id: '' });
  const [stocktakes, setStocktakes] = useState([]);
  const [stocktakeItems, setStocktakeItems] = useState([]);
  const [stocktakeNote, setStocktakeNote] = useState('');
  const [stocktakeItemsById, setStocktakeItemsById] = useState({});
  const [stocktakeItemLoading, setStocktakeItemLoading] = useState({});
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
  const [aiForecast, setAiForecast] = useState([]);
  const [aiForecastMeta, setAiForecastMeta] = useState({ method: 'moving_average', horizon: 7, window: 7 });
  const [aiInventorySuggest, setAiInventorySuggest] = useState([]);
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
  const [loading, setLoading] = useState(false);
  const [inputForm, setInputForm] = useState({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
  const [issueForm, setIssueForm] = useState({ ingredient_id: '', quantity: '', reason: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ ingredient_id: '', quantity: '', reason: '' });

  const api = useMemo(() => createDashboardApi(apiBase, token), [apiBase, token]);

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

  const setBranchIdAndPersist = (value) => {
    setBranchId(value);
    localStorage.setItem('branchId', value);
  };

  const fetchData = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const requests = await Promise.allSettled([
        api.getRevenue(params),
        api.getOrders(params),
        api.getAuditLogs({ limit: 8 }),
        api.getInventoryTransactions(params),
        api.getInventoryInputs(params),
        api.getEmployees(params)
      ]);

      const [revenueRes, ordersRes, auditRes, inventoryRes, inputsRes, employeesRes] = requests;
      setRevenue(revenueRes.status === 'fulfilled' ? revenueRes.value : []);
      setOrders(ordersRes.status === 'fulfilled' ? ordersRes.value : []);
      setAuditLogs(auditRes.status === 'fulfilled' ? auditRes.value : []);
      setInventoryTx(inventoryRes.status === 'fulfilled' ? inventoryRes.value : []);
      setInventoryInputs(inputsRes.status === 'fulfilled' ? inputsRes.value : []);
      setEmployees(employeesRes.status === 'fulfilled' ? employeesRes.value : []);
      setInventoryAlerts([]);
    } catch {
      setStatusMessage('Khong the tai du lieu. Kiem tra API hoac quyen truy cap.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuData = async () => {
    if (!token) return;
    setStatusMessage('');
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      if (categoryId) params.category_id = categoryId;
      if (productSearch) params.q = productSearch;
      params.include_inactive = true;
      const [catData, prodData] = await Promise.all([
        api.getProductCategories(),
        api.getProducts(params)
      ]);
      setCategories(catData);
      setProducts(prodData);
    } catch {
      setCategories([]);
      setProducts([]);
    }
  };

  const fetchInventoryMeta = async () => {
    if (!token) return;
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const [catData, ingData, stockData] = await Promise.all([
        api.getInventoryCategories(),
        api.getIngredients(branchId ? { branch_id: branchId } : {}),
        api.getStocktakes(params)
      ]);
      setInventoryCategories(catData);
      setIngredients(ingData);
      setStocktakes(stockData);
    } catch {
      setInventoryCategories([]);
      setIngredients([]);
      setStocktakes([]);
    }
  };

  const resetIngredientForm = () => {
    setIngredientForm({ name: '', unit: '', category_id: '' });
  };

  const handleCreateIngredient = async () => {
    if (!ingredientForm.name.trim()) {
      setStatusMessage('Can ten nguyen lieu.');
      return;
    }
    try {
      const data = await api.createIngredient({
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit?.trim() || null,
        category_id: ingredientForm.category_id || null
      });
      setIngredients(prev => [...prev, data]);
      resetIngredientForm();
      setStatusMessage('Da tao nguyen lieu.');
    } catch (err) {
      if (err?.status === 409) {
        setStatusMessage('Nguyen lieu da ton tai.');
        return;
      }
      setStatusMessage('Khong the tao nguyen lieu.');
    }
  };

  const refreshEmployees = async () => {
    if (!token) return;
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const data = await api.getEmployees(params);
      setEmployees(data);
    } catch {
      setEmployees([]);
    }
  };

  const refreshShifts = async () => {
    if (!token) return;
    try {
      const data = await api.getShifts();
      setShifts(data);
    } catch {
      setShifts([]);
    }
  };

  const refreshBranches = async () => {
    if (!token) return;
    try {
      const data = await api.getBranches();
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
      const data = await api.getTables({ branch_id: branchIdValue });
      setTables(data);
    } catch {
      setTables([]);
    }
  };

  const fetchAttendanceLogs = async () => {
    if (!token) return;
    try {
      const params = {};
      if (branchId) params.branch_id = branchId;
      if (attendanceFilters.employee_id) params.employee_id = attendanceFilters.employee_id;
      if (attendanceFilters.from) params.from = attendanceFilters.from;
      if (attendanceFilters.to) params.to = attendanceFilters.to;
      const data = await api.getAttendanceLogs(params);
      setAttendanceLogs(data);
    } catch {
      setAttendanceLogs([]);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch {
      setRoles([]);
    }
  };

  const fetchPermissions = async () => {
    if (!token) return;
    try {
      const data = await api.getPermissions();
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

  const assignUserBranchAccess = async (userId, nextBranchId) => {
    if (!token || !userId || !nextBranchId) return;
    await api.assignUserBranch(userId, { branch_id: nextBranchId });
  };

  const handleSaveEmployee = async () => {
    if (!token) return;
    try {
      if (employeeForm.id) {
        await api.updateEmployee(employeeForm.id, {
          full_name: employeeForm.full_name || null,
          phone: employeeForm.phone || null,
          position: employeeForm.position || null,
          branch_id: employeeForm.branch_id || null
        });
        if (employeeForm.branch_id) {
          await assignUserBranchAccess(employeeForm.user_id, employeeForm.branch_id);
        }
        setStatusMessage('Da cap nhat nhan vien.');
      } else {
        if (!employeeForm.username || !employeeForm.password) {
          setStatusMessage('Can username va password de tao nhan vien.');
          return;
        }
        const created = await api.createEmployee({
          username: employeeForm.username,
          password: employeeForm.password,
          full_name: employeeForm.full_name || null,
          phone: employeeForm.phone || null,
          position: employeeForm.position || null,
          branch_id: employeeForm.branch_id || null
        });
        if (created?.user_id && employeeForm.branch_id) {
          await assignUserBranchAccess(created.user_id, employeeForm.branch_id);
        }
        setStatusMessage('Da tao nhan vien.');
      }
      resetEmployeeForm();
      refreshEmployees();
    } catch {
      setStatusMessage('Khong the luu nhan vien.');
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
    if (!window.confirm(`Xoa nhan vien ${emp.full_name || emp.username || emp.id}?`)) return;
    try {
      await api.deleteEmployee(emp.id);
      setStatusMessage('Da xoa nhan vien.');
      refreshEmployees();
    } catch {
      setStatusMessage('Khong the xoa nhan vien.');
    }
  };

  const handleToggleUserStatus = async (emp) => {
    if (!token || !emp?.user_id) return;
    try {
      await api.updateUserStatus(emp.user_id, { is_active: !emp.is_active });
      setStatusMessage('Da cap nhat trang thai tai khoan.');
      refreshEmployees();
    } catch {
      setStatusMessage('Khong the cap nhat trang thai.');
    }
  };

  const handleAssignRole = async (emp) => {
    if (!token || !emp?.user_id) return;
    const roleId = roleSelections[emp.user_id];
    if (!roleId) {
      setStatusMessage('Chon role truoc khi gan.');
      return;
    }
    try {
      await api.assignRoleToUser(emp.user_id, { role_id: roleId });
      setStatusMessage('Da gan vai tro.');
    } catch {
      setStatusMessage('Khong the gan vai tro.');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setStatusMessage('Can ten role.');
      return;
    }
    try {
      await api.createRole({ name: newRoleName.trim() });
      setNewRoleName('');
      fetchRoles();
      setStatusMessage('Da tao role.');
    } catch {
      setStatusMessage('Khong the tao role.');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!role?.id) return;
    if (!window.confirm(`Xoa role ${role.name || role.id}?`)) return;
    try {
      await api.deleteRole(role.id);
      setRoles(prev => prev.filter(item => item.id !== role.id));
      if (selectedRoleId === role.id) {
        setSelectedRoleId('');
      }
      setRolePermissions(prev => {
        const next = { ...prev };
        delete next[role.id];
        return next;
      });
      setStatusMessage('Da xoa role.');
    } catch {
      setStatusMessage('Khong the xoa role.');
    }
  };

  const handleToggleRolePermission = async (permissionId, isChecked) => {
    if (!selectedRoleId) {
      setStatusMessage('Chon role truoc khi gan quyen.');
      return;
    }
    try {
      if (isChecked) {
        await api.assignRolePermission(selectedRoleId, { permission_id: permissionId });
      } else {
        await api.removeRolePermission(selectedRoleId, permissionId);
      }
      fetchRolePermissions(selectedRoleId);
      setStatusMessage(isChecked ? 'Da gan quyen cho role.' : 'Da bo gan quyen.');
    } catch {
      setStatusMessage('Khong the cap nhat quyen cho role.');
    }
  };

  const handleCreateShift = async () => {
    if (!shiftForm.name || !shiftForm.start_time || !shiftForm.end_time) {
      setStatusMessage('Can ten ca, gio bat dau va gio ket thuc.');
      return;
    }
    try {
      await api.createShift({
        name: shiftForm.name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time
      });
      setShiftForm({ name: '', start_time: '', end_time: '' });
      setStatusMessage('Da tao ca lam.');
      refreshShifts();
    } catch {
      setStatusMessage('Khong the tao ca lam.');
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

  const handleSelectBranchForm = (branchIdValue) => {
    if (!branchIdValue) {
      resetBranchForm();
      return;
    }
    const selected = branches.find(branch => branch.id === branchIdValue);
    if (selected) handleEditBranch(selected);
  };

  const resetBranchForm = () => {
    setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' });
  };

  const handleUpdateBranchLocation = async () => {
    if (!branchForm.id) {
      setStatusMessage('Chon chi nhanh de cap nhat.');
      return;
    }
    if (branchForm.latitude === '' || branchForm.longitude === '') {
      setStatusMessage('Can toa do latitude va longitude.');
      return;
    }
    try {
      await api.updateBranchLocation(branchForm.id, {
        latitude: Number(branchForm.latitude),
        longitude: Number(branchForm.longitude)
      });
      setStatusMessage('Da cap nhat toa do chi nhanh.');
      refreshBranches();
    } catch {
      setStatusMessage('Khong the cap nhat toa do chi nhanh.');
    }
  };

  const handleCreateBranch = async () => {
    if (!branchForm.name.trim()) {
      setStatusMessage('Can ten chi nhanh.');
      return;
    }
    try {
      await api.createBranch({ name: branchForm.name.trim(), address: branchForm.address || null });
      setBranchForm({ id: '', name: '', address: '', latitude: '', longitude: '' });
      setStatusMessage('Da tao chi nhanh.');
      refreshBranches();
    } catch {
      setStatusMessage('Khong the tao chi nhanh.');
    }
  };

  const handleUpdateBranchInfo = async () => {
    if (!branchForm.id) {
      setStatusMessage('Chon chi nhanh de cap nhat.');
      return;
    }
    try {
      await api.updateBranch(branchForm.id, { name: branchForm.name || null, address: branchForm.address || null });
      setStatusMessage('Da cap nhat thong tin chi nhanh.');
      refreshBranches();
    } catch {
      setStatusMessage('Khong the cap nhat chi nhanh.');
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (!branch?.id) return;
    if (!window.confirm(`Xoa chi nhanh ${branch.name}?`)) return;
    try {
      await api.deleteBranch(branch.id);
      setStatusMessage('Da xoa chi nhanh.');
      refreshBranches();
    } catch {
      setStatusMessage('Khong the xoa chi nhanh.');
    }
  };

  const handleCreateTable = async () => {
    if (!tableBranchId) {
      setStatusMessage('Chon chi nhanh de tao ban.');
      return;
    }
    if (!tableForm.name.trim()) {
      setStatusMessage('Can ten ban.');
      return;
    }
    try {
      await api.createTable({ branch_id: tableBranchId, name: tableForm.name.trim(), status: tableForm.status });
      setTableForm({ id: '', name: '', status: 'AVAILABLE' });
      setStatusMessage('Da tao ban.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Khong the tao ban.');
    }
  };

  const handleEditTable = (table) => {
    setTableForm({ id: table.id, name: table.name || '', status: table.status || 'AVAILABLE' });
  };

  const handleUpdateTable = async () => {
    if (!tableForm.id) return;
    try {
      await api.updateTable(tableForm.id, { name: tableForm.name || null, status: tableForm.status || null });
      setTableForm({ id: '', name: '', status: 'AVAILABLE' });
      setStatusMessage('Da cap nhat ban.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Khong the cap nhat ban.');
    }
  };

  const handleDeleteTable = async (table) => {
    if (!table?.id) return;
    if (!window.confirm(`Xoa ${table.name}?`)) return;
    try {
      await api.deleteTable(table.id);
      setStatusMessage('Da xoa ban.');
      refreshTables(tableBranchId);
    } catch {
      setStatusMessage('Khong the xoa ban.');
    }
  };

  const fetchRolePermissions = async (roleId) => {
    if (!token || !roleId) return;
    try {
      const data = await api.getRolePermissions(roleId);
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
  }, [apiBase, branchId, token, tableBranchId]);

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
      setShowChangePassword(false);
    } catch {
      setStatusMessage('Khong the doi mat khau.');
    }
  };

  const revenueSeries = useMemo(() => revenue.map(row => Number(row.revenue || 0)), [revenue]);
  const ordersSeries = useMemo(() => revenue.map(row => Number(row.orders || 0)), [revenue]);
  const revenueChartData = useMemo(() => {
    return revenue.map((row, idx) => ({
      name: row.bucket ? new Date(row.bucket).toLocaleDateString('vi-VN') : `#${idx + 1}`,
      value: Number(row.revenue || 0)
    }));
  }, [revenue]);

  const handleForecastAI = async () => {
    if (!ordersSeries.length) {
      setStatusMessage('Chua co du lieu don hang theo ngay de du bao.');
      return;
    }
    const meta = { method: 'moving_average', horizon: 7, window: 7 };
    setAiForecastMeta(meta);
    try {
      const payload = {
        series: ordersSeries,
        horizon: meta.horizon,
        method: meta.method,
        window: meta.window
      };
      const data = await api.forecastAi(payload);
      setAiForecast(Array.isArray(data.forecast) ? data.forecast : []);
    } catch {
      setAiForecast([]);
    }
  };

  const handleInventoryAiReorder = async () => {
    if (!branchId) {
      setStatusMessage('Can chon branch_id de goi y nhap kho.');
      return;
    }
    try {
      const data = await api.inventoryAiReorder({ branch_id: branchId });
      setAiInventorySuggest(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setAiInventorySuggest([]);
    }
  };

  const handleCreateInput = async () => {
    if (!branchId) {
      setStatusMessage('Can chon branch_id de nhap kho.');
      return;
    }
    if (!inputForm.ingredient_id || !inputForm.quantity) {
      setStatusMessage('Can ingredient_id va so luong.');
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
      setInputForm({ ingredient_id: '', quantity: '', unit_cost: '', reason: '' });
      setInventoryInputs(prev => [...data.items, ...prev]);
      setStatusMessage('Nhap kho thanh cong.');
    } catch {
      setStatusMessage('Khong the nhap kho.');
    }
  };

  const handleCreateIssue = async () => {
    if (!branchId) {
      setStatusMessage('Can chon branch_id de xuat kho.');
      return;
    }
    if (!issueForm.ingredient_id || issueForm.quantity === '') {
      setStatusMessage('Can ingredient_id va so luong.');
      return;
    }
    const qty = Number(issueForm.quantity || 0);
    if (qty === 0) {
      setStatusMessage('So luong phai khac 0.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        reason: issueForm.reason || null,
        items: [{ ingredient_id: issueForm.ingredient_id, quantity: qty }]
      };
      await api.createInventoryIssue(payload);
      setIssueForm({ ingredient_id: '', quantity: '', reason: '' });
      setStatusMessage('Da tao phieu xuat kho.');
      fetchData();
    } catch {
      setStatusMessage('Khong the tao phieu xuat kho.');
    }
  };

  const handleCreateAdjustment = async () => {
    if (!branchId) {
      setStatusMessage('Can chon branch_id de dieu chinh ton.');
      return;
    }
    if (!adjustmentForm.ingredient_id || adjustmentForm.quantity === '') {
      setStatusMessage('Can ingredient_id va so luong.');
      return;
    }
    const qty = Number(adjustmentForm.quantity || 0);
    if (qty === 0) {
      setStatusMessage('So luong phai khac 0.');
      return;
    }
    try {
      const payload = {
        branch_id: branchId,
        reason: adjustmentForm.reason || null,
        items: [{ ingredient_id: adjustmentForm.ingredient_id, quantity: qty }]
      };
      await api.createInventoryAdjustment(payload);
      setAdjustmentForm({ ingredient_id: '', quantity: '', reason: '' });
      setStatusMessage('Da tao phieu dieu chinh.');
      fetchData();
    } catch {
      setStatusMessage('Khong the tao phieu dieu chinh.');
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

  const removeStocktakeItem = (ingredientId) => {
    setStocktakeItems(prev => prev.filter(item => item.ingredient_id !== ingredientId));
  };

  const handleCreateStocktake = async () => {
    if (!branchId) {
      setStatusMessage('Can branch_id de kiem ke.');
      return;
    }
    if (stocktakeItems.length === 0) {
      setStatusMessage('Can it nhat 1 dong kiem ke.');
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
      const data = await api.createStocktake(payload);
      setStocktakes(prev => [data, ...prev]);
      setStocktakeItems([]);
      setStocktakeNote('');
      setStatusMessage('Da tao phieu kiem ke.');
    } catch {
      setStatusMessage('Khong the tao phieu kiem ke.');
    }
  };

  const fetchStocktakeItems = async (stocktakeId) => {
    if (!token || !stocktakeId) return;
    setStocktakeItemLoading(prev => ({ ...prev, [stocktakeId]: true }));
    try {
      const items = await api.getStocktakeItems(stocktakeId);
      setStocktakeItemsById(prev => ({ ...prev, [stocktakeId]: items }));
    } catch {
      setStocktakeItemsById(prev => ({ ...prev, [stocktakeId]: [] }));
    } finally {
      setStocktakeItemLoading(prev => ({ ...prev, [stocktakeId]: false }));
    }
  };

  const handleApproveStocktake = async (stocktakeId) => {
    try {
      await api.approveStocktake(stocktakeId);
      setStocktakes(prev => prev.map(item => item.id === stocktakeId ? { ...item, status: 'APPROVED' } : item));
      setStatusMessage('Da duyet phieu kiem ke.');
    } catch {
      setStatusMessage('Khong the duyet phieu kiem ke.');
    }
  };

  const handleCreateInventoryCategory = async () => {
    if (!inventoryCategoryName.trim()) {
      setStatusMessage('Can ten phan loai kho.');
      return;
    }
    try {
      const data = await api.createInventoryCategory({ name: inventoryCategoryName.trim() });
      setInventoryCategories(prev => [...prev, data]);
      setInventoryCategoryName('');
      setStatusMessage('Da tao phan loai kho.');
    } catch {
      setStatusMessage('Khong the tao phan loai kho.');
    }
  };

  const handleDeleteInventoryCategory = async (categoryIdValue) => {
    const confirmed = window.confirm('Xoa phan loai kho nay?');
    if (!confirmed) return;
    try {
      await api.deleteInventoryCategory(categoryIdValue);
      setInventoryCategories(prev => prev.filter(cat => cat.id !== categoryIdValue));
      setIngredients(prev => prev.map(item => item.category_id === categoryIdValue ? { ...item, category_id: null } : item));
      setStatusMessage('Da xoa phan loai kho.');
    } catch {
      setStatusMessage('Khong the xoa phan loai kho.');
    }
  };

  const handleUpdateIngredientCategory = async (ingredientId, categoryIdValue) => {
    try {
      const data = await api.updateIngredient(ingredientId, { category_id: categoryIdValue || null });
      setIngredients(prev => prev.map(item => item.id === data.id ? { ...item, category_id: data.category_id } : item));
      setStatusMessage('Da cap nhat phan loai nguyen lieu.');
    } catch {
      setStatusMessage('Khong the cap nhat phan loai nguyen lieu.');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      setStatusMessage('Can ten nhom san pham.');
      return;
    }
    try {
      const data = await api.createProductCategory({ name: categoryName.trim() });
      setCategories(prev => [...prev, data]);
      setCategoryName('');
      setStatusMessage('Da tao nhom san pham.');
    } catch {
      setStatusMessage('Khong the tao nhom san pham.');
    }
  };

  const handleDeleteCategory = async (categoryIdValue) => {
    const confirmed = window.confirm('Xoa nhom san pham nay?');
    if (!confirmed) return;
    try {
      await api.deleteProductCategory(categoryIdValue);
      setCategories(prev => prev.filter(cat => cat.id !== categoryIdValue));
      setProducts(prev => prev.map(item => item.category_id === categoryIdValue ? { ...item, category_id: null } : item));
      if (categoryId === categoryIdValue) setCategoryId('');
      setStatusMessage('Da xoa nhom san pham.');
    } catch {
      setStatusMessage('Khong the xoa nhom san pham.');
    }
  };

  const resetProductForm = () => {
    setProductForm({ id: '', name: '', sku: '', price: '', category_id: '' });
    setProductImageFile(null);
  };

  const handleCreateProduct = async () => {
    if (!branchId) {
      setStatusMessage('Can branch_id de tao san pham.');
      return;
    }
    if (!productForm.name || productForm.price === '') {
      setStatusMessage('Can ten va gia san pham.');
      return;
    }
    try {
      const data = await api.createProduct({
        branch_id: branchId,
        name: productForm.name,
        sku: productForm.sku || null,
        price: Number(productForm.price),
        category_id: productForm.category_id || null
      });
      setProducts(prev => [data, ...prev]);
      resetProductForm();
      setStatusMessage('Da tao san pham.');
    } catch {
      setStatusMessage('Khong the tao san pham.');
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
  };

  const handleUpdateProduct = async () => {
    if (!productForm.id) return;
    try {
      const data = await api.updateProduct(productForm.id, {
        name: productForm.name || null,
        sku: productForm.sku || null,
        price: productForm.price === '' ? null : Number(productForm.price),
        category_id: productForm.category_id || null
      });
      setProducts(prev => prev.map(item => item.id === data.id ? data : item));
      resetProductForm();
      setStatusMessage('Da cap nhat san pham.');
    } catch {
      setStatusMessage('Khong the cap nhat san pham.');
    }
  };

  const handleUploadProductImage = async (fileOverride = null) => {
    const fileToUpload = fileOverride || productImageFile;
    if (!productForm.id) {
      setStatusMessage('Can chon san pham de upload anh.');
      return;
    }
    if (!fileToUpload) {
      setStatusMessage('Chon anh san pham truoc khi upload.');
      return;
    }
    try {
      const data = await api.uploadProductImage(productForm.id, fileToUpload);
      setProducts(prev => prev.map(item => item.id === data.id ? { ...item, image_url: data.image_url } : item));
      setProductImageFile(null);
      setStatusMessage('Da upload anh san pham.');
    } catch (err) {
      if (err?.payload?.error === 'image_too_large') {
        setStatusMessage(`Anh vuot qua ${err.payload.max_mb}MB.`);
        return;
      }
      if (err?.payload?.error === 'invalid_image_type') {
        setStatusMessage('Chi ho tro file anh hop le.');
        return;
      }
      if (err?.status === 403) {
        setStatusMessage('Ban khong co quyen upload anh cho san pham nay.');
        return;
      }
      if (err?.status === 404) {
        setStatusMessage('Khong tim thay san pham de upload anh.');
        return;
      }
      setStatusMessage('Khong the upload anh san pham.');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product?.id) return;
    if (!window.confirm(`Xoa san pham "${product.name}"?`)) return;
    try {
      await api.deleteProduct(product.id);
      setProducts(prev => prev.filter(item => item.id !== product.id));
      setStatusMessage('Da xoa san pham.');
      if (productForm.id === product.id) resetProductForm();
    } catch (err) {
      if (err?.status === 409) {
        setStatusMessage('San pham da co don hang, khong the xoa.');
        return;
      }
      setStatusMessage('Khong the xoa san pham.');
    }
  };

  const handleToggleProductActive = async (product) => {
    if (!product?.id) return;
    const nextActive = !product.is_active;
    const actionLabel = nextActive ? 'Mo ban' : 'Khoa ban';
    if (!window.confirm(`${actionLabel} san pham "${product.name}"?`)) return;
    try {
      const updated = await api.updateProduct(product.id, { is_active: nextActive });
      setProducts(prev => prev.map(item => item.id === product.id ? { ...item, is_active: updated.is_active } : item));
      setStatusMessage(nextActive ? 'Da mo khoa san pham.' : 'Da khoa san pham.');
      if (productForm.id === product.id) {
        setProductForm(prev => ({ ...prev, is_active: updated.is_active }));
      }
    } catch {
      setStatusMessage('Khong the cap nhat trang thai san pham.');
    }
  };

  const downloadReport = async (path, format = 'xlsx') => {
    if (!token) return;
    const params = {};
    if (branchId) params.branch_id = branchId;
    params.format = format;
    try {
      const blob = await api.downloadReport(path, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${path.split('/').pop()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatusMessage('Khong the xuat file bao cao.');
    }
  };

  const handleApiBaseChange = (value) => {
    setApiBase(value);
    localStorage.setItem('apiBase', value);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setShowChangePassword(false);
  };

  const state = {
    apiBase,
    token,
    branchId,
    loginForm,
    showLogin,
    showChangePassword,
    statusMessage,
    passwordForm,
    loading,
    revenue,
    orders,
    inventoryAlerts,
    auditLogs,
    inventoryTx,
    inventoryInputs,
    inventoryCategories,
    ingredients,
    ingredientForm,
    ingredientForm,
    stocktakes,
    stocktakeItems,
    stocktakeNote,
    stocktakeItemsById,
    stocktakeItemLoading,
    selectedIngredient,
    actualQty,
    inventoryCategoryName,
    employees,
    shifts,
    shiftForm,
    roles,
    permissions,
    branches,
    branchForm,
    tables,
    tableForm,
    tableBranchId,
    attendanceLogs,
    attendanceFilters,
    employeeForm,
    roleSelections,
    newRoleName,
    selectedRoleId,
    aiForecast,
    aiForecastMeta,
    aiInventorySuggest,
    categories,
    products,
    categoryId,
    productSearch,
    categoryName,
    productForm,
    inputForm,
    issueForm,
    adjustmentForm
  };

  const actions = {
    fetchData,
    fetchMenuData,
    fetchInventoryMeta,
    handleCreateIngredient,
    resetIngredientForm,
    refreshEmployees,
    refreshShifts,
    refreshBranches,
    refreshTables,
    fetchAttendanceLogs,
    fetchRoles,
    fetchPermissions,
    fetchRolePermissions,
    setApiBase,
    setBranchId,
    setBranchIdAndPersist,
    setLoginForm,
    setShowLogin,
    setShowChangePassword,
    setPasswordForm,
    setStatusMessage,
    setShiftForm,
    setAttendanceFilters,
    setEmployeeForm,
    setRoleSelections,
    setNewRoleName,
    setSelectedRoleId,
    setCategoryName,
    setProductForm,
    setProductImageFile,
    setCategoryId,
    setProductSearch,
    setInventoryCategoryName,
    setIngredientForm,
    setSelectedIngredient,
    setActualQty,
    setStocktakeNote,
    setInputForm,
    setIssueForm,
    setAdjustmentForm,
    setTableBranchId,
    setTableForm,
    setBranchForm,
    handleCreateCategory,
    handleDeleteCategory,
    handleCreateProduct,
    handleEditProduct,
    handleUpdateProduct,
    handleUploadProductImage,
    handleDeleteProduct,
    handleToggleProductActive,
    resetProductForm,
    handleCreateInventoryCategory,
    handleDeleteInventoryCategory,
    handleUpdateIngredientCategory,
    handleAddStocktakeItem,
    removeStocktakeItem,
    handleCreateStocktake,
    handleApproveStocktake,
    fetchStocktakeItems,
    handleForecastAI,
    handleInventoryAiReorder,
    handleCreateInput,
    handleCreateIssue,
    handleCreateAdjustment,
    handleCreateShift,
    handleSaveEmployee,
    handleEditEmployee,
    handleToggleUserStatus,
    handleDeleteEmployee,
    resetEmployeeForm,
    handleAssignRole,
    handleCreateRole,
    handleDeleteRole,
    handleToggleRolePermission,
    handleEditBranch,
    handleSelectBranchForm,
    handleCreateBranch,
    handleUpdateBranchInfo,
    handleUpdateBranchLocation,
    handleDeleteBranch,
    resetBranchForm,
    handleCreateTable,
    handleEditTable,
    handleUpdateTable,
    handleDeleteTable,
    downloadReport,
    handleApiBaseChange,
    handleLogout,
    handleLogin,
    handleChangePassword
  };

  const derived = {
    totalRevenueToday,
    orderCount,
    revenueSeries,
    ordersSeries,
    revenueChartData,
    categoryMap,
    branchNameMap,
    ingredientMap,
    assignedPermissionIds
  };

  return { state, actions, derived };
}
