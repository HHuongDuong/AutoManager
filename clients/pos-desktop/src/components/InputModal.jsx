export default function InputModal({
  show,
  inputForm,
  ingredients,
  inventoryInputs,
  onInputChange,
  onClose,
  onCreateInput,
  formatVnd
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Nhập kho nguyên liệu</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="summary">
            <div className="form-row">
              <label>Nguyên liệu</label>
              <select
                value={inputForm.ingredient_id}
                onChange={(e) => onInputChange({ ...inputForm, ingredient_id: e.target.value })}
              >
                <option value="">Chọn nguyên liệu</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Số lượng</label>
              <input
                type="number"
                value={inputForm.quantity}
                onChange={(e) => onInputChange({ ...inputForm, quantity: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Đơn giá</label>
              <input
                type="number"
                value={inputForm.unit_cost}
                onChange={(e) => onInputChange({ ...inputForm, unit_cost: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Ly do</label>
              <input
                value={inputForm.reason}
                onChange={(e) => onInputChange({ ...inputForm, reason: e.target.value })}
              />
            </div>
          </div>
          <div className="methods">
            <h4>Phiếu nhập gần đây</h4>
            <div className="cart-list">
              {inventoryInputs.slice(0, 6).map(input => (
                <div key={input.id} className="cart-item">
                  <div>
                    <h4>{input.ingredient_id}</h4>
                    <span>{input.quantity} • {formatVnd(input.unit_cost || 0)}</span>
                  </div>
                  <strong>{formatVnd(input.total_cost || 0)}</strong>
                </div>
              ))}
              {inventoryInputs.length === 0 && <div className="empty">Chưa có phiếu nhập.</div>}
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn primary" onClick={onCreateInput}>Tạo phiếu nhập</button>
        </footer>
      </div>
    </section>
  );
}
