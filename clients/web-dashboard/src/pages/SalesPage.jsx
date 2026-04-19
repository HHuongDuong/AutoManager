import { useEffect, useState } from 'react';
import OrdersTable from '../components/OrdersTable';
import { useDashboardContext } from '../context/DashboardContext';

export default function SalesPage() {
  const { state } = useDashboardContext();
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(state.orders.length / pageSize));
  const startIndex = (orderPage - 1) * pageSize;
  const pagedOrders = state.orders.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setOrderPage(1);
  }, [state.orders.length]);

  useEffect(() => {
    if (orderPage > totalPages) setOrderPage(totalPages);
  }, [orderPage, totalPages]);

  return (
    <section className="grid single">
      <div className="card">
        <div className="card-head">
          <h3>Danh sách đơn hàng</h3>
          <span>{state.orders.length} đơn</span>
        </div>
        <div className="table-toolbar">
          <div className="pager">
            <span>
              Hiển thị {pagedOrders.length}/{state.orders.length} • Trang {orderPage}/{totalPages}
            </span>
            <button
              className="btn ghost"
              onClick={() => setOrderPage((prev) => Math.max(1, prev - 1))}
              disabled={orderPage <= 1}
            >
              Trước
            </button>
            <button
              className="btn ghost"
              onClick={() => setOrderPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={orderPage >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
        <OrdersTable orders={pagedOrders} />
      </div>
    </section>
  );
}
