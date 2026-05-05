import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import RevenueChart from '../components/RevenueChart';
import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/useDashboardContext';

const formatDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export default function SalesPage() {
  const { state, derived } = useDashboardContext();
  const [orderItems, setOrderItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [branchView, setBranchView] = useState('all');
  const [itemView, setItemView] = useState('top5');

  const paidOrderIds = useMemo(() => {
    return new Set(
      state.orders
        .filter(order => (order.payment_status || order.order_status) === 'PAID')
        .map(order => order.id)
    );
  }, [state.orders]);

  useEffect(() => {
    let active = true;

    const fetchOrderItems = async () => {
      if (!state.apiBase || !state.token || state.orders.length === 0) {
        setOrderItems([]);
        return;
      }
      setItemsLoading(true);
      setItemsError('');
      try {
        const headers = { Authorization: `Bearer ${state.token}` };
        const requests = state.orders.map(order =>
          fetch(`${state.apiBase}/orders/${order.id}`, { headers })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        );
        const results = await Promise.allSettled(requests);
        const items = [];
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value?.items) {
            items.push(...result.value.items);
          }
        });
        if (active) setOrderItems(items);
      } catch {
        if (active) setItemsError('Không thể tải chi tiết đơn hàng.');
      } finally {
        if (active) setItemsLoading(false);
      }
    };

    fetchOrderItems();
    return () => {
      active = false;
    };
  }, [state.apiBase, state.token, state.orders]);

  const revenueByDay = useMemo(() => {
    const map = new Map();
    state.orders.forEach(order => {
      if ((order.payment_status || order.order_status) !== 'PAID') return;
      const dateKey = formatDateKey(order.created_at);
      if (!dateKey) return;
      const total = Number(order.total_amount || 0);
      map.set(dateKey, (map.get(dateKey) || 0) + total);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
  }, [state.orders]);

  const revenueByBranchRaw = useMemo(() => {
    const map = new Map();
    state.orders.forEach(order => {
      if ((order.payment_status || order.order_status) !== 'PAID') return;
      const branchLabel = derived.branchNameMap.get(order.branch_id) || order.branch_id || 'Không rõ';
      const total = Number(order.total_amount || 0);
      map.set(branchLabel, (map.get(branchLabel) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [state.orders, derived.branchNameMap]);

  const revenueByBranch = useMemo(() => {
    if (branchView === 'top5') return revenueByBranchRaw.slice(0, 5);
    return revenueByBranchRaw;
  }, [branchView, revenueByBranchRaw]);

  const revenueByItemRaw = useMemo(() => {
    const map = new Map();
    orderItems.forEach(item => {
      if (!paidOrderIds.has(item.order_id)) return;
      const label = item.name || item.product_id || 'Không rõ';
      const total = Number(item.subtotal || 0);
      map.set(label, (map.get(label) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [orderItems, paidOrderIds]);

  const revenueByItem = useMemo(() => {
    if (itemView === 'top5') return revenueByItemRaw.slice(0, 5);
    return revenueByItemRaw;
  }, [itemView, revenueByItemRaw]);

  return (
    <section className="grid sales-grid">
      <div className="card full-row">
        <div className="card-head">
          <h3>Doanh thu theo ngày (Tất cả các chi nhánh)</h3>
          <span>{revenueByDay.length} ngày có doanh thu</span>
        </div>
        <div className="chart-wrapper">
          <RevenueChart data={revenueByDay} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="head-title">
            <h3>Doanh thu theo chi nhánh</h3>
            <span>{revenueByBranch.length} chi nhánh</span>
          </div>
          <div className="head-actions">
            <select value={branchView} onChange={(e) => setBranchView(e.target.value)}>
              <option value="all">Tất cả chi nhánh</option>
              <option value="top5">Top 5 chi nhánh</option>
            </select>
          </div>
        </div>
        <div className="chart-wrapper">
          {revenueByBranch.length === 0 ? (
            <div className="empty">Chưa có dữ liệu doanh thu.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByBranch} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatVnd(value)} />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="head-title">
            <h3>Doanh thu theo món</h3>
            <span>{revenueByItem.length} món</span>
          </div>
          <div className="head-actions">
            <select value={itemView} onChange={(e) => setItemView(e.target.value)}>
              <option value="all">Tất cả món</option>
              <option value="top5">Top 5 món</option>
            </select>
          </div>
        </div>
        <div className="chart-wrapper">
          {itemsLoading && <div className="empty">Đang tải dữ liệu theo món...</div>}
          {!itemsLoading && itemsError && <div className="empty">{itemsError}</div>}
          {!itemsLoading && !itemsError && revenueByItem.length === 0 && (
            <div className="empty">Chưa có dữ liệu theo món.</div>
          )}
          {!itemsLoading && !itemsError && revenueByItem.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByItem} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatVnd(value)} />
                <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
