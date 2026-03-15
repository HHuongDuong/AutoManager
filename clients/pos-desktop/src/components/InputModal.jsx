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
          <h2>Nhap kho nguyen lieu</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="summary">
            <div className="form-row">
              <label>Nguyen lieu</label>
              <select
                value={inputForm.ingredient_id}
                onChange={(e) => onInputChange({ ...inputForm, ingredient_id: e.target.value })}
              >
                <option value="">Chon nguyen lieu</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>So luong</label>
              <input
                type="number"
                value={inputForm.quantity}
                onChange={(e) => onInputChange({ ...inputForm, quantity: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>Don gia</label>
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
            <h4>Phieu nhap gan day</h4>
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
              {inventoryInputs.length === 0 && <div className="empty">Chua co phieu nhap.</div>}
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Dong</button>
          <button className="btn primary" onClick={onCreateInput}>Tao phieu nhap</button>
        </footer>
      </div>
    </section>
  );
}
