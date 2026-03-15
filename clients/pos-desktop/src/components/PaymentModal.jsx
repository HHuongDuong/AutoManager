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
          <h2>Thanh toan</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="summary">
            <p>Tong tien</p>
            <h3>{formatVnd(total)}</h3>
            <div className="form-row">
              <label>Khach dua</label>
              <input type="number" value={cashReceived} onChange={(e) => onCashReceivedChange(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Tien thoi</label>
              <input value={formatVnd(changeDue)} disabled />
            </div>
          </div>
          <div className="methods">
            <h4>Phuong thuc</h4>
            <div className="method-grid">
              {['CASH', 'TRANSFER'].map(method => (
                <button
                  key={method}
                  className={paymentMethod === method ? 'active' : ''}
                  onClick={() => onPaymentMethodChange(method)}
                >
                  {method === 'CASH' ? 'Tien mat' : 'Chuyen khoan'}
                </button>
              ))}
            </div>
            <div className="toggle">
              <input type="checkbox" checked={payNow} onChange={onTogglePayNow} />
              <span>Thanh toan ngay</span>
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>De sau</button>
          <button className="btn primary" onClick={onConfirm}>Xac nhan</button>
        </footer>
      </div>
    </section>
  );
}
