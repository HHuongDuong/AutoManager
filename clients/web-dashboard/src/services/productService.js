import { api } from './api';

export const getProducts = (params = {}, apiBase) => {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return api(`/products${suffix}`, {}, apiBase);
};

export const createProduct = (data, apiBase) => api('/products', {
  method: 'POST',
  body: JSON.stringify(data)
}, apiBase);
