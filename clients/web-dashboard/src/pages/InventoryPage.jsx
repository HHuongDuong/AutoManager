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
          <h3>Chi nhánh đang chọn</h3>
        </div>
        <div className="form-row">
          <label>Chi nhánh</label>
          <select
            value={state.branchId}
            onChange={(e) => actions.setBranchIdAndPersist(e.target.value)}
            disabled={!state.branches.length}
          >
            <option value="">Tất cả chi nhánh</option>
            {state.branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          {!state.branches.length && <small className="hint">Cần tải danh sách chi nhánh trước.</small>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Phân loại kho</h3>
          <span>{state.inventoryCategories.length} nhóm</span>
        </div>
        <div className="form-row">
          <label>Tên nhóm</label>
          <input value={state.inventoryCategoryName} onChange={(e) => actions.setInventoryCategoryName(e.target.value)} placeholder="Nguyên liệu, vật dụng..." />
        </div>
        <button className="btn primary" onClick={actions.handleCreateInventoryCategory}>Tạo phân loại</button>
        <div className="list">
          {state.inventoryCategories.map(cat => (
            <div key={cat.id} className="list-item">
              <div>
                <h4>{cat.name}</h4>
                <p>{cat.id}</p>
              </div>
              <div className="row-actions">
                <strong>Nhóm</strong>
                <button className="btn ghost" onClick={() => actions.handleDeleteInventoryCategory(cat.id)}>Xóa</button>
              </div>
            </div>
          ))}
          {state.inventoryCategories.length === 0 && <div className="empty">Chưa có phân loại kho.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Nguyên liệu & phân loại</h3>
          <span>{state.ingredients.length} nguyên liệu</span>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Tên</span>
            <span>Đơn vị</span>
            <span>Phân loại</span>
            <span></span>
          </div>
          {state.ingredients.map(ing => (
            <div key={ing.id} className="table-row">
              <span>{ing.name}</span>
              <span>{ing.unit || '---'}</span>
              <select value={ing.category_id || ''} onChange={(e) => actions.handleUpdateIngredientCategory(ing.id, e.target.value)}>
                <option value="">Chưa phân loại</option>
                {state.inventoryCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <span></span>
            </div>
          ))}
          {state.ingredients.length === 0 && <div className="empty">Chưa có nguyên liệu.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Phiếu kiểm kê</h3>
          <span>{state.stocktakeItems.length} dòng</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Nguyên liệu</label>
            <select value={state.selectedIngredient} onChange={(e) => actions.setSelectedIngredient(e.target.value)}>
              <option value="">Chọn nguyên liệu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Số lượng thực tế</label>
            <input value={state.actualQty} onChange={(e) => actions.setActualQty(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={actions.handleAddStocktakeItem}>Thêm dòng</button>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Nguyên liệu</span>
            <span>Thực tế</span>
            <span>Hành động</span>
            <span></span>
          </div>
          {state.stocktakeItems.map(item => (
            <div key={item.ingredient_id} className="table-row">
              <span>{item.name}</span>
              <span>{item.actual_qty}</span>
              <button className="btn ghost" onClick={() => actions.removeStocktakeItem(item.ingredient_id)}>Xóa</button>
              <span></span>
            </div>
          ))}
          {state.stocktakeItems.length === 0 && <div className="empty">Chưa có dòng kiểm kê.</div>}
        </div>
        <div className="form-row">
          <label>Ghi chú</label>
          <input value={state.stocktakeNote} onChange={(e) => actions.setStocktakeNote(e.target.value)} placeholder="Ghi chú kiểm kê" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateStocktake}>Tạo phiếu kiểm kê</button>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sách kiểm kê</h3>
          <span>{state.stocktakes.length} phiếu</span>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Mã phiếu</span>
            <span>Trạng thái</span>
            <span>Ngày</span>
            <span>Hành động</span>
          </div>
          {state.stocktakes.slice(0, 8).map(item => (
            <div key={item.id} className="table-row">
              <span>{item.id}</span>
              <span>{item.status}</span>
              <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
              <div className="row-actions">
                {item.status === 'DRAFT' ? (
                  <button className="btn ghost" onClick={() => actions.handleApproveStocktake(item.id)}>Duyệt</button>
                ) : (
                  <span className="muted-text">Đã duyệt</span>
                )}
              </div>
            </div>
          ))}
          {state.stocktakes.length === 0 && <div className="empty">Chưa có phiếu kiểm kê.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Giao dịch kho gần đây</h3>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Nguyên liệu</span>
            <span>Loại</span>
            <span>Số lượng</span>
            <span>Ngày</span>
          </div>
          {state.inventoryTx.slice(0, 8).map(tx => (
            <div key={tx.id} className="table-row">
              <span>{derived.ingredientMap.get(tx.ingredient_id) || tx.ingredient_id}</span>
              <span>{tx.transaction_type}</span>
              <span>{tx.quantity}</span>
              <span>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
          ))}
          {state.inventoryTx.length === 0 && <div className="empty">Chưa có giao dịch kho.</div>}
        </div>
      </div>

      <div className="card">
        <h3>Nhập kho nguyên liệu</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.inputForm.ingredient_id} onChange={(e) => actions.setInputForm({ ...state.inputForm, ingredient_id: e.target.value })}>
              <option value="">Chọn nguyên liệu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Số lượng</label>
            <input value={state.inputForm.quantity} onChange={(e) => actions.setInputForm({ ...state.inputForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Đơn giá</label>
            <input value={state.inputForm.unit_cost} onChange={(e) => actions.setInputForm({ ...state.inputForm, unit_cost: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.inputForm.reason} onChange={(e) => actions.setInputForm({ ...state.inputForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateInput}>Tạo phiếu nhập</button>
      </div>

      <div className="card">
        <h3>Xuất kho nguyên liệu</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.issueForm.ingredient_id} onChange={(e) => actions.setIssueForm({ ...state.issueForm, ingredient_id: e.target.value })}>
              <option value="">Chọn nguyên liệu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Số lượng</label>
            <input value={state.issueForm.quantity} onChange={(e) => actions.setIssueForm({ ...state.issueForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.issueForm.reason} onChange={(e) => actions.setIssueForm({ ...state.issueForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateIssue}>Tạo phiếu xuất</button>
        <div className="table">
          <div className="table-row head">
            <span>Nguyên liệu</span>
            <span>Số lượng</span>
            <span>Ngày</span>
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
            <div className="empty">Chưa có phiếu xuất kho.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Điều chỉnh tồn kho</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ingredient ID</label>
            <select value={state.adjustmentForm.ingredient_id} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, ingredient_id: e.target.value })}>
              <option value="">Chọn nguyên liệu</option>
              {state.ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Số lượng (+/-)</label>
            <input value={state.adjustmentForm.quantity} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, quantity: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Ly do</label>
            <input value={state.adjustmentForm.reason} onChange={(e) => actions.setAdjustmentForm({ ...state.adjustmentForm, reason: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateAdjustment}>Tạo phiếu điều chỉnh</button>
        <div className="table">
          <div className="table-row head">
            <span>Nguyên liệu</span>
            <span>Số lượng</span>
            <span>Ngày</span>
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
            <div className="empty">Chưa có phiếu điều chỉnh.</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Danh sách nhập kho</h3>
        <div className="table">
          <div className="table-row head">
            <span>Nguyên liệu</span>
            <span>Số lượng</span>
            <span>Đơn giá</span>
            <span>Tổng</span>
          </div>
          {state.inventoryInputs.slice(0, 10).map(input => (
            <div key={input.id} className="table-row">
              <span>{derived.ingredientMap.get(input.ingredient_id) || input.ingredient_id}</span>
              <span>{input.quantity}</span>
              <span>{formatVnd(input.unit_cost || 0)}</span>
              <strong>{formatVnd(input.total_cost || 0)}</strong>
            </div>
          ))}
          {state.inventoryInputs.length === 0 && <div className="empty">Chưa có phiếu nhập kho.</div>}
        </div>
      </div>

    </section>
  );
}
