import { useEffect } from 'react';
import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/DashboardContext';

export default function InventoryPage() {
  const { state, actions, derived } = useDashboardContext();

  useEffect(() => {
    if (!state.token) return;
    actions.fetchInventoryMeta();
  }, [state.apiBase, state.branchId, state.token]);

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>Chi nhanh dang chon</h3>
        </div>
        <div className="form-row">
          <label>Chi nhanh</label>
          <select
            value={state.branchId}
            onChange={(e) => actions.setBranchIdAndPersist(e.target.value)}
            disabled={!state.branches.length}
          >
            <option value="">Tat ca chi nhanh</option>
            {state.branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          {!state.branches.length && <small className="hint">Can tai danh sach chi nhanh truoc.</small>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Phan loai kho</h3>
          <span>{state.inventoryCategories.length} nhom</span>
        </div>
        <div className="form-row">
          <label>Ten nhom</label>
          <input value={state.inventoryCategoryName} onChange={(e) => actions.setInventoryCategoryName(e.target.value)} placeholder="Nguyen lieu, vat dung..." />
        </div>
        <button className="btn primary" onClick={actions.handleCreateInventoryCategory}>Tao phan loai</button>
        <div className="list">
          {state.inventoryCategories.map(cat => (
            <div key={cat.id} className="list-item">
              <div>
                <h4>{cat.name}</h4>
                <p>{cat.id}</p>
              </div>
              <div className="row-actions">
                <strong>Nhom</strong>
                <button className="btn ghost" onClick={() => actions.handleDeleteInventoryCategory(cat.id)}>Xoa</button>
              </div>
            </div>
          ))}
          {state.inventoryCategories.length === 0 && <div className="empty">Chua co phan loai kho.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Nguyen lieu & phan loai</h3>
          <span>{state.ingredients.length} nguyen lieu</span>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ten</span>
            <span>Don vi</span>
            <span>Phan loai</span>
            <span></span>
          </div>
          {state.ingredients.map(ing => (
            <div key={ing.id} className="table-row">
              <span>{ing.name}</span>
              <span>{ing.unit || '---'}</span>
              <select value={ing.category_id || ''} onChange={(e) => actions.handleUpdateIngredientCategory(ing.id, e.target.value)}>
                <option value="">Chua phan loai</option>
                {state.inventoryCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <span></span>
            </div>
          ))}
          {state.ingredients.length === 0 && <div className="empty">Chua co nguyen lieu.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Phieu kiem ke</h3>
          <span>{state.stocktakeItems.length} dong</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Nguyen lieu</label>
            <select value={state.selectedIngredient} onChange={(e) => actions.setSelectedIngredient(e.target.value)}>
              <option value="">Chon nguyen lieu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>So luong thuc te</label>
            <input value={state.actualQty} onChange={(e) => actions.setActualQty(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={actions.handleAddStocktakeItem}>Them dong</button>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Nguyen lieu</span>
            <span>Thuc te</span>
            <span>Hanh dong</span>
            <span></span>
          </div>
          {state.stocktakeItems.map(item => (
            <div key={item.ingredient_id} className="table-row">
              <span>{item.name}</span>
              <span>{item.actual_qty}</span>
              <button className="btn ghost" onClick={() => actions.removeStocktakeItem(item.ingredient_id)}>Xoa</button>
              <span></span>
            </div>
          ))}
          {state.stocktakeItems.length === 0 && <div className="empty">Chua co dong kiem ke.</div>}
        </div>
        <div className="form-row">
          <label>Ghi chu</label>
          <input value={state.stocktakeNote} onChange={(e) => actions.setStocktakeNote(e.target.value)} placeholder="Ghi chu kiem ke" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateStocktake}>Tao phieu kiem ke</button>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sach kiem ke</h3>
          <span>{state.stocktakes.length} phieu</span>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ma phieu</span>
            <span>Trang thai</span>
            <span>Ngay</span>
            <span>Hanh dong</span>
          </div>
          {state.stocktakes.slice(0, 8).map(item => (
            <div key={item.id} className="table-row">
              <span>{item.id}</span>
              <span>{item.status}</span>
              <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
              <div className="row-actions">
                {item.status === 'DRAFT' ? (
                  <button className="btn ghost" onClick={() => actions.handleApproveStocktake(item.id)}>Duyet</button>
                ) : (
                  <span className="muted-text">Da duyet</span>
                )}
              </div>
            </div>
          ))}
          {state.stocktakes.length === 0 && <div className="empty">Chua co phieu kiem ke.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Giao dich kho gan day</h3>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Nguyen lieu</span>
            <span>Loai</span>
            <span>So luong</span>
            <span>Ngay</span>
          </div>
          {state.inventoryTx.slice(0, 8).map(tx => (
            <div key={tx.id} className="table-row">
              <span>{derived.ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
              <span>{tx.transaction_type}</span>
              <span>{tx.quantity}</span>
              <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
          ))}
          {state.inventoryTx.length === 0 && <div className="empty">Chua co giao dich kho.</div>}
        </div>
      </div>

      <div className="card">
        <h3>Nhap kho nguyen lieu</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.inputForm.ingredient_id} onChange={(e) => actions.setInputForm({ ...state.inputForm, ingredient_id: e.target.value })}>
              <option value="">Chon nguyen lieu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>So luong</label>
            <input value={state.inputForm.quantity} onChange={(e) => actions.setInputForm({ ...state.inputForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Don gia</label>
            <input value={state.inputForm.unit_cost} onChange={(e) => actions.setInputForm({ ...state.inputForm, unit_cost: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.inputForm.reason} onChange={(e) => actions.setInputForm({ ...state.inputForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateInput}>Tao phieu nhap</button>
      </div>

      <div className="card">
        <h3>Xuat kho nguyen lieu</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.issueForm.ingredient_id} onChange={(e) => actions.setIssueForm({ ...state.issueForm, ingredient_id: e.target.value })}>
              <option value="">Chon nguyen lieu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>So luong</label>
            <input value={state.issueForm.quantity} onChange={(e) => actions.setIssueForm({ ...state.issueForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.issueForm.reason} onChange={(e) => actions.setIssueForm({ ...state.issueForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateIssue}>Tao phieu xuat</button>
        <div className="table">
          <div className="table-row head">
            <span>Nguyen lieu</span>
            <span>So luong</span>
            <span>Ngay</span>
            <span></span>
          </div>
          {state.inventoryTx.filter(tx => tx.transaction_type === 'OUT').slice(0, 6).map(tx => (
            <div key={tx.id} className="table-row">
              <span>{derived.ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
              <span>{tx.quantity}</span>
              <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
              <span></span>
            </div>
          ))}
          {state.inventoryTx.filter(tx => tx.transaction_type === 'OUT').length === 0 && (
            <div className="empty">Chua co phieu xuat kho.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Dieu chinh ton kho</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.adjustmentForm.ingredient_id} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, ingredient_id: e.target.value })}>
              <option value="">Chon nguyen lieu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>So luong (+/-)</label>
            <input value={state.adjustmentForm.quantity} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.adjustmentForm.reason} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateAdjustment}>Tao phieu dieu chinh</button>
        <div className="table">
          <div className="table-row head">
            <span>Nguyen lieu</span>
            <span>So luong</span>
            <span>Ngay</span>
            <span></span>
          </div>
          {state.inventoryTx.filter(tx => tx.transaction_type === 'ADJUST').slice(0, 6).map(tx => (
            <div key={tx.id} className="table-row">
              <span>{derived.ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
              <span>{tx.quantity}</span>
              <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
              <span></span>
            </div>
          ))}
          {state.inventoryTx.filter(tx => tx.transaction_type === 'ADJUST').length === 0 && (
            <div className="empty">Chua co phieu dieu chinh.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Danh sach nhap kho</h3>
        <div className="table">
          <div className="table-row head">
            <span>Nguyen lieu</span>
            <span>So luong</span>
            <span>Don gia</span>
            <span>Tong</span>
          </div>
          {state.inventoryInputs.slice(0, 10).map(input => (
            <div key={input.id} className="table-row">
              <span>{derived.ingredientMap.get(input.ingredient_id) || input.ingredient_id}</span>
              <span>{input.quantity}</span>
              <span>{formatVnd(input.unit_cost || 0)}</span>
              <strong>{formatVnd(input.total_cost || 0)}</strong>
            </div>
          ))}
          {state.inventoryInputs.length === 0 && <div className="empty">Chua co phieu nhap kho.</div>}
        </div>
      </div>

    </section>
  );
}
