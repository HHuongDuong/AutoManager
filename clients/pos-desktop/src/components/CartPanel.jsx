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
  onPrintLast,
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
        <h2>Hoa don</h2>
        <button className="btn ghost" onClick={onClearOrder}>Tao moi</button>
      </div>
      <div className="form-row">
        <label>Loai don</label>
        <select value={orderType} onChange={(e) => onOrderTypeChange(e.target.value)}>
          <option value="DINE_IN">DINE_IN</option>
          <option value="TAKE_AWAY">TAKE_AWAY</option>
        </select>
      </div>
      {orderType === 'DINE_IN' && (
        <div className="form-row">
          <label>Chon ban</label>
          <select value={selectedTableId} onChange={(e) => onSelectTable(e.target.value)}>
            <option value="">-- Chon ban --</option>
            {tables.filter(table => table.status === 'AVAILABLE').map(table => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.status})
              </option>
            ))}
          </select>
        </div>
      )}
      {currentOrderId && <div className="status">Dang chinh phieu: {currentOrderId}</div>}
      <div className="cart-list">
        {cart.length === 0 && <div className="empty">Chua co mon nao.</div>}
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
          <span>Tam tinh</span>
          <strong>{formatVnd(total)}</strong>
        </div>
        <div>
          <span>Giam gia</span>
          <strong>{formatVnd(0)}</strong>
        </div>
        <div className="total">
          <span>Tong cong</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>
      <div className="cart-actions">
        <button className="btn ghost" onClick={onSyncQueue}>Dong bo ({queuePendingCount})</button>
        <button className="btn ghost" onClick={onShowInputModal}>Nhap kho</button>
        <button className="btn ghost" onClick={onPrintLast}>In hoa don</button>
        <button className="btn primary" onClick={onShowPayment} disabled={!cart.length}>Thanh toan</button>
      </div>
      {statusMessage && <div className="status">{statusMessage}</div>}
      <div className="methods">
        <h4>Phieu mo</h4>
        {loadingOrders && <div className="empty">Dang tai phieu...</div>}
        {!loadingOrders && openOrders.length === 0 && <div className="empty">Chua co phieu mo.</div>}
        <div className="cart-list">
          {openOrders.slice(0, 6).map(order => (
            <div key={order.id} className="cart-item">
              <div>
                <h4>{tableNameMap[order.table_id] || order.table_id || 'Ban chua chon'}</h4>
                <span>Don: {order.id}</span>
                <span>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <button className="btn ghost" onClick={() => onLoadOrder(order.id)}>Mo</button>
              <button className="btn ghost" onClick={() => onCancelOrder(order.id)}>Xoa</button>
            </div>
          ))}
        </div>
      </div>
      <div className="status">Trang thai: {isOnline ? 'Online' : 'Offline'} • WS: {wsStatus}</div>
    </aside>
  );
}
