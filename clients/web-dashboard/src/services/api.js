const API_BASE = import.meta.env.VITE_API_URL || localStorage.getItem('apiBase') || 'http://localhost:3000';

export const getApiBase = (override) => override || localStorage.getItem('apiBase') || API_BASE;

export const api = async (url, options = {}, baseOverride) => {
  const base = getApiBase(baseOverride);
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;

  if (!isForm && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${url}`, { ...options, headers });
  if (options.raw) return res;
  return res.json();
};
