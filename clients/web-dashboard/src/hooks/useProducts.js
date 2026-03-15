import { useEffect, useState } from 'react';
import { getProducts } from '../services/productService';

export default function useProducts({ params = {}, apiBase, enabled = true } = {}) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!enabled) return;
    getProducts(params, apiBase).then(setProducts).catch(() => setProducts([]));
  }, [enabled, apiBase, JSON.stringify(params)]);

  return products;
}
