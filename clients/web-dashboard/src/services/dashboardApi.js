const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const buildHeaders = (token, contentType) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
};

const request = async (apiBase, path, options = {}) => {
  const res = await fetch(`${apiBase}${path}`, options);
  if (!res.ok) {
    const error = new Error('request_failed');
    error.status = res.status;
    throw error;
  }
  return res;
};

const requestJson = async (apiBase, path, options = {}) => {
  const res = await request(apiBase, path, options);
  return res.json();
};

const requestBlob = async (apiBase, path, options = {}) => {
  const res = await request(apiBase, path, options);
  return res.blob();
};

export default function createDashboardApi(apiBase, token) {
  const authHeaders = () => buildHeaders(token);
  const jsonHeaders = () => buildHeaders(token, 'application/json');

  return {
    getRevenue: (params) => requestJson(apiBase, `/reports/revenue${buildQuery(params)}`, { headers: authHeaders() }),
    getOrders: (params) => requestJson(apiBase, `/orders${buildQuery(params)}`, { headers: authHeaders() }),
    getAuditLogs: (params) => requestJson(apiBase, `/audit-logs${buildQuery(params)}`, { headers: authHeaders() }),
    getInventoryTransactions: (params) => requestJson(apiBase, `/inventory/transactions${buildQuery(params)}`, { headers: authHeaders() }),
    getInventoryInputs: (params) => requestJson(apiBase, `/inventory/inputs${buildQuery(params)}`, { headers: authHeaders() }),
    getEmployees: (params) => requestJson(apiBase, `/employees${buildQuery(params)}`, { headers: authHeaders() }),
    getProductCategories: () => requestJson(apiBase, '/product-categories', { headers: authHeaders() }),
    getProducts: (params) => requestJson(apiBase, `/products${buildQuery(params)}`, { headers: authHeaders() }),
    getInventoryCategories: () => requestJson(apiBase, '/inventory/categories', { headers: authHeaders() }),
    getIngredients: () => requestJson(apiBase, '/ingredients', { headers: authHeaders() }),
    getStocktakes: (params) => requestJson(apiBase, `/stocktakes${buildQuery(params)}`, { headers: authHeaders() }),
    getShifts: () => requestJson(apiBase, '/shifts', { headers: authHeaders() }),
    getBranches: () => requestJson(apiBase, '/branches', { headers: authHeaders() }),
    getTables: (params) => requestJson(apiBase, `/tables${buildQuery(params)}`, { headers: authHeaders() }),
    getAttendanceLogs: (params) => requestJson(apiBase, `/attendance/logs${buildQuery(params)}`, { headers: authHeaders() }),
    getRoles: () => requestJson(apiBase, '/rbac/roles', { headers: authHeaders() }),
    getPermissions: () => requestJson(apiBase, '/rbac/permissions', { headers: authHeaders() }),
    getRolePermissions: (roleId) => requestJson(apiBase, `/rbac/roles/${roleId}/permissions`, { headers: authHeaders() }),
    assignUserBranch: (userId, payload) => requestJson(apiBase, `/rbac/users/${userId}/branches`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateEmployee: (employeeId, payload) => requestJson(apiBase, `/employees/${employeeId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createEmployee: (payload) => requestJson(apiBase, '/employees', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteEmployee: (employeeId) => request(apiBase, `/employees/${employeeId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    updateUserStatus: (userId, payload) => requestJson(apiBase, `/users/${userId}/status`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    assignRoleToUser: (userId, payload) => requestJson(apiBase, `/rbac/users/${userId}/roles`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createRole: (payload) => requestJson(apiBase, '/rbac/roles', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    assignRolePermission: (roleId, payload) => requestJson(apiBase, `/rbac/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    removeRolePermission: (roleId, permissionId) => request(apiBase, `/rbac/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    createShift: (payload) => requestJson(apiBase, '/shifts', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateBranchLocation: (branchId, payload) => requestJson(apiBase, `/branches/${branchId}/location`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createBranch: (payload) => requestJson(apiBase, '/branches', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateBranch: (branchId, payload) => requestJson(apiBase, `/branches/${branchId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteBranch: (branchId) => request(apiBase, `/branches/${branchId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    createTable: (payload) => requestJson(apiBase, '/tables', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateTable: (tableId, payload) => requestJson(apiBase, `/tables/${tableId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteTable: (tableId) => request(apiBase, `/tables/${tableId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    login: (payload) => requestJson(apiBase, '/auth/login', {
      method: 'POST',
      headers: buildHeaders(null, 'application/json'),
      body: JSON.stringify(payload)
    }),
    changePassword: (payload) => request(apiBase, '/users/me/password', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    suggestReorder: (payload) => requestJson(apiBase, '/ai/suggest-reorder', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createInventoryInput: (payload) => requestJson(apiBase, '/inventory/inputs', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createInventoryIssue: (payload) => request(apiBase, '/inventory/issues', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createInventoryAdjustment: (payload) => request(apiBase, '/inventory/adjustments', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createStocktake: (payload) => requestJson(apiBase, '/stocktakes', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    approveStocktake: (stocktakeId) => request(apiBase, `/stocktakes/${stocktakeId}/approve`, {
      method: 'POST',
      headers: authHeaders()
    }),
    createInventoryCategory: (payload) => requestJson(apiBase, '/inventory/categories', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteInventoryCategory: (categoryId) => request(apiBase, `/inventory/categories/${categoryId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    updateIngredient: (ingredientId, payload) => requestJson(apiBase, `/ingredients/${ingredientId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createProductCategory: (payload) => requestJson(apiBase, '/product-categories', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteProductCategory: (categoryId) => request(apiBase, `/product-categories/${categoryId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    createProduct: (payload) => requestJson(apiBase, '/products', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateProduct: (productId, payload) => requestJson(apiBase, `/products/${productId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateBranchPrice: (productId, payload) => request(apiBase, `/products/${productId}/branch-price`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    uploadProductImage: (productId, file) => {
      const formData = new FormData();
      formData.append('image', file);
      return requestJson(apiBase, `/products/${productId}/image`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
    },
    deleteProduct: (productId) => request(apiBase, `/products/${productId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    downloadReport: (path, params) => requestBlob(apiBase, `${path}${buildQuery(params)}`, { headers: authHeaders() })
  };
}
