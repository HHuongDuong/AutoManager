export default function CartPanel({
  orderType,
  onOrderTypeChange,
  selectedTableId,
  tables,
  onSelectTable,
  currentOrderId,
  cart,
  onUpdateQty,
  onRemoveItem,
  formatVnd,
  total,
  onClearOrder,
  onSyncQueue,
  queuePendingCount,
  onShowInputModal,
  onShowPayment,
  statusMessage,
  openOrders,
  loadingOrders,
  onLoadOrder,
  onCancelOrder,
  isOnline,
  wsStatus,
  tableNameMap
}) {
  return (
    <aside className="cart-panel">
      <div className="cart-header">
        <h2>Đơn hàng</h2>
        <button className="btn ghost" onClick={onClearOrder}>Tạo mới</button>
      </div>
      <div className="form-row">
        <label>Loại đơn</label>
        <select value={orderType} onChange={(e) => onOrderTypeChange(e.target.value)}>
          <option value="DINE_IN">DINE_IN</option>
          <option value="TAKE_AWAY">TAKE_AWAY</option>
        </select>
      </div>
      {orderType === 'DINE_IN' && (
        <div className="form-row">
          <label>Chọn bàn</label>
          <select value={selectedTableId} onChange={(e) => onSelectTable(e.target.value)}>
            <option value="">-- Chọn bàn --</option>
            {tables.filter(table => table.status === 'AVAILABLE').map(table => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.status})
              </option>
            ))}
          </select>
        </div>
      )}
      {currentOrderId && <div className="status">Đang chỉnh phiếu: {currentOrderId}</div>}
      <div className="cart-list">
        {cart.length === 0 && <div className="empty">Chưa có món nào.</div>}
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <div>
              <h4>{item.name}</h4>
              <span>{formatVnd(item.price)}</span>
            </div>
            <div className="qty">
              <button onClick={() => onUpdateQty(item.id, -1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.id, 1)}>+</button>
            </div>
            <strong>{formatVnd(item.price * item.quantity)}</strong>
            <button className="icon" onClick={() => onRemoveItem(item.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <div>
          <span>Tạm tính</span>
          <strong>{formatVnd(total)}</strong>
        </div>
        <div>
          <span>Giảm giá</span>
          <strong style={{ color: 'var(--muted)' }}>{formatVnd(0)}</strong>
        </div>
        <div className="total">
          <span>Tổng cộng</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>

      <div className="cart-actions">
        <button className="btn ghost" onClick={onSyncQueue}>Đồng bộ ({queuePendingCount})</button>
        <button className="btn ghost" onClick={onShowInputModal}>Nhập kho</button>
        <button className="btn primary" onClick={onShowPayment} disabled={!cart.length}>Thanh toán</button>
      </div>
      {statusMessage && <div className="status">{statusMessage}</div>}
      <div className="methods">
        <h4>Phiếu mở</h4>
        {loadingOrders && <div className="empty">Đang tải phiếu...</div>}
        {!loadingOrders && openOrders.length === 0 && <div className="empty">Chưa có phiếu mở.</div>}
        <div className="cart-list">
          {openOrders.slice(0, 6).map(order => (
            <div key={order.id} className="cart-item">
              <div>
                <h4>{tableNameMap[order.table_id] || order.table_id || 'Bàn chưa chọn'}</h4>
                <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <button className="btn ghost" onClick={() => onLoadOrder(order.id)}>Mở</button>
              <button className="btn ghost" onClick={() => onCancelOrder(order.id)}>Xóa</button>
            </div>
          ))}
        </div>
      </div>
      <div className="status">Trạng thái: {isOnline ? 'Online' : 'Offline'} • WS: {wsStatus}</div>
    </aside>
  );
}
