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

export default function createPosApi(apiBase, token) {
  const authHeaders = () => buildHeaders(token);
  const jsonHeaders = () => buildHeaders(token, 'application/json');

  return {
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
    getMe: () => requestJson(apiBase, '/me', { headers: authHeaders() }),
    getProducts: (params) => requestJson(apiBase, `/products${buildQuery(params)}`, { headers: authHeaders() }),
    getCategories: () => requestJson(apiBase, '/product-categories', { headers: authHeaders() }),
    getIngredients: () => requestJson(apiBase, '/ingredients', { headers: authHeaders() }),
    getBranches: () => requestJson(apiBase, '/branches', { headers: authHeaders() }),
    getTables: (params) => requestJson(apiBase, `/tables${buildQuery(params)}`, { headers: authHeaders() }),
    getInventoryInputs: (params) => requestJson(apiBase, `/inventory/inputs${buildQuery(params)}`, { headers: authHeaders() }),
    getOpenOrders: (params) => requestJson(apiBase, `/orders${buildQuery(params)}`, { headers: authHeaders() }),
    getOrder: (orderId) => requestJson(apiBase, `/orders/${orderId}`, { headers: authHeaders() }),
    addOrderItem: (orderId, payload) => requestJson(apiBase, `/orders/${orderId}/items`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    updateOrderItem: (orderId, itemId, payload) => requestJson(apiBase, `/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    deleteOrderItem: (orderId, itemId) => request(apiBase, `/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
      headers: authHeaders()
    }),
    createOrder: (payload, idempotencyKey) => requestJson(apiBase, '/orders', {
      method: 'POST',
      headers: {
        ...jsonHeaders(),
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    }),
    createPayment: (orderId, payload) => request(apiBase, `/orders/${orderId}/payments`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    closeOrder: (orderId) => request(apiBase, `/orders/${orderId}/close`, {
      method: 'POST',
      headers: authHeaders()
    }),
    cancelOrder: (orderId, payload) => request(apiBase, `/orders/${orderId}`, {
      method: 'DELETE',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }),
    createInventoryInput: (payload) => requestJson(apiBase, '/inventory/inputs', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    })
  };
}
