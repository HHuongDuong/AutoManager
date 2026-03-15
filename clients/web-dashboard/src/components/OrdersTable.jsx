import { formatVnd } from '../utils/format';

export default function OrdersTable({ orders }) {
  return (
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
  );
}
