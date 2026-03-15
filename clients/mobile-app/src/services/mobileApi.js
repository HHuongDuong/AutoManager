const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, value);
  });
  const result = query.toString();
  return result ? `?${result}` : '';
};

export const createMobileApi = (apiBase, token) => {
  const request = async ({
    path,
    method = 'GET',
    params,
    body,
    headers,
    idempotencyKey
  }) => {
    const url = `${apiBase}${path}${buildQuery(params)}`;
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return response;
  };

  const getJson = async (options) => {
    const res = await request(options);
    if (!res.ok) throw new Error('fetch_failed');
    return res.json();
  };

  return { request, getJson };
};
