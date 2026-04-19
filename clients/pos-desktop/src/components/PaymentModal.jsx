export default function PaymentModal({
  show,
  total,
  cashReceived,
  changeDue,
  paymentMethod,
  onCashReceivedChange,
  onPaymentMethodChange,
  payNow,
  onTogglePayNow,
  onClose,
  onConfirm,
  formatVnd
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Thanh toán</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="summary">
            <p>Tổng tiền</p>
            <h3>{formatVnd(total)}</h3>
            <div className="form-row">
              <label>Khách đưa</label>
              <input type="number" value={cashReceived} onChange={(e) => onCashReceivedChange(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Tiền thừa</label>
              <input value={formatVnd(changeDue)} disabled />
            </div>
          </div>
          <div className="methods">
            <h4>Phương thức</h4>
            <div className="method-grid">
              {['CASH', 'TRANSFER'].map(method => (
                <button
                  key={method}
                  className={paymentMethod === method ? 'active' : ''}
                  onClick={() => onPaymentMethodChange(method)}
                >
                  {method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                </button>
              ))}
            </div>
            <div className="toggle">
              <input type="checkbox" checked={payNow} onChange={onTogglePayNow} />
              <span>Thanh toán ngay</span>
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Để sau</button>
          <button className="btn primary" onClick={onConfirm}>Xác nhận</button>
        </footer>
      </div>
    </section>
  );
}
