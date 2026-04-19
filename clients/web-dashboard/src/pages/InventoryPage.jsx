import { useEffect, useMemo, useState } from 'react';
import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/DashboardContext';

export default function InventoryPage() {
  const { state, actions, derived } = useDashboardContext();
  const [activeTab, setActiveTab] = useState('classify');
  const [expandedStocktakes, setExpandedStocktakes] = useState({});

  const formatThousands = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('');
  const [ingredientPage, setIngredientPage] = useState(1);
  const ingredientPageSize = 10;

  const filteredIngredients = useMemo(() => {
    const keyword = ingredientSearch.trim().toLowerCase();
    return state.ingredients.filter(ing => {
      const matchesName = !keyword || ing.name?.toLowerCase().includes(keyword);
      if (!ingredientCategoryFilter) return matchesName;
      if (ingredientCategoryFilter === 'none') {
        return matchesName && !ing.category_id;
      }
      return matchesName && ing.category_id === ingredientCategoryFilter;
    });
  }, [ingredientCategoryFilter, ingredientSearch, state.ingredients]);

  const totalIngredientPages = Math.max(1, Math.ceil(filteredIngredients.length / ingredientPageSize));
  const ingredientStartIndex = (ingredientPage - 1) * ingredientPageSize;
  const pagedIngredients = filteredIngredients.slice(ingredientStartIndex, ingredientStartIndex + ingredientPageSize);

  useEffect(() => {
    setIngredientPage(1);
  }, [ingredientCategoryFilter, ingredientSearch]);

  useEffect(() => {
    if (ingredientPage > totalIngredientPages) setIngredientPage(totalIngredientPages);
  }, [ingredientPage, totalIngredientPages]);

  useEffect(() => {
    if (!state.token) return;
    actions.fetchInventoryMeta();
  }, [state.apiBase, state.branchId, state.token]);

  const toggleStocktakeDetail = (stocktakeId) => {
    setExpandedStocktakes(prev => {
      const next = !prev[stocktakeId];
      if (next && !state.stocktakeItemsById[stocktakeId]) {
        actions.fetchStocktakeItems(stocktakeId);
      }
      return { ...prev, [stocktakeId]: next };
    });
  };

  return (
    <section className="grid">
      <div className="inventory-top full-row">
        <div className="tab-bar">
          <button
            className={`btn ${activeTab === 'classify' ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab('classify')}
          >
            Phân loại nguyên liệu
          </button>
          <button
            className={`btn ${activeTab === 'stock' ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab('stock')}
          >
            Xuất nhập kho
          </button>
        </div>

        <div className="inventory-branch card">
          <div className="card-head">
            <h3>Chi nhánh</h3>
          </div>
          <div className="form-row">
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
      </div>

      {activeTab === 'classify' && (
        <>
          <div className="grid ingredient-grid full-row">
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
              <div className="form-grid">
                <div className="form-row">
                  <label>Tên nguyên liệu</label>
                  <input
                    value={state.ingredientForm.name}
                    onChange={(e) => actions.setIngredientForm({ ...state.ingredientForm, name: e.target.value })}
                    placeholder="Ví dụ: Đường"
                  />
                </div>
                <div className="form-row">
                  <label>Đơn vị</label>
                  <input
                    value={state.ingredientForm.unit}
                    onChange={(e) => actions.setIngredientForm({ ...state.ingredientForm, unit: e.target.value })}
                    placeholder="kg, g, l..."
                  />
                </div>
                <div className="form-row">
                  <label>Phân loại</label>
                  <select
                    value={state.ingredientForm.category_id}
                    onChange={(e) => actions.setIngredientForm({ ...state.ingredientForm, category_id: e.target.value })}
                  >
                    <option value="">Chưa phân loại</option>
                    {state.inventoryCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={actions.handleCreateIngredient}>Tạo nguyên liệu</button>
                <button className="btn ghost" onClick={actions.resetIngredientForm}>Làm mới</button>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Danh sách nguyên liệu</h3>
                <span>{filteredIngredients.length} nguyên liệu</span>
              </div>
              <div className="table-toolbar">
                <div className="form-row">
                  <label>Tìm theo tên</label>
                  <input
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    placeholder="Ví dụ: đường, sữa"
                  />
                </div>
                <div className="form-row">
                  <label>Lọc phân loại</label>
                  <select
                    value={ingredientCategoryFilter}
                    onChange={(e) => setIngredientCategoryFilter(e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="none">Chưa phân loại</option>
                    {state.inventoryCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pager">
                <span>
                  Hiển thị {pagedIngredients.length}/{filteredIngredients.length} • Trang {ingredientPage}/{totalIngredientPages}
                </span>
                <button
                  className="btn ghost"
                  onClick={() => setIngredientPage((prev) => Math.max(1, prev - 1))}
                  disabled={ingredientPage <= 1}
                >
                  Trước
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setIngredientPage((prev) => Math.min(totalIngredientPages, prev + 1))}
                  disabled={ingredientPage >= totalIngredientPages}
                >
                  Sau
                </button>
              </div>
              <div className="table">
                <div className="table-row head">
                  <span>Tên</span>
                  <span>Đơn vị</span>
                  <span>Phân loại</span>
                  <span></span>
                </div>
                {pagedIngredients.map(ing => (
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
                {filteredIngredients.length === 0 && <div className="empty">Chưa có nguyên liệu.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'stock' && (
        <>
          <div className="grid stock-grid full-row">
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
                <input
                  value={formatThousands(state.inputForm.unit_cost)}
                  onChange={(e) => actions.setInputForm({
                    ...state.inputForm,
                    unit_cost: e.target.value.replace(/\D/g, '')
                  })}
                />
              </div>
              <div className="form-row">
                <label>Lý do</label>
                <input value={state.inputForm.reason} onChange={(e) => actions.setInputForm({ ...state.inputForm, reason: e.target.value })} />
              </div>
            </div>
            <button className="btn primary" onClick={actions.handleCreateInput}>Tạo phiếu nhập</button>
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
                <div key={item.id}>
                  <div className="table-row">
                    <span>{item.id}</span>
                    <span>{item.status}</span>
                    <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    <div className="row-actions">
                      <button className="btn ghost" onClick={() => toggleStocktakeDetail(item.id)}>
                        {expandedStocktakes[item.id] ? 'Ẩn' : 'Chi tiết'}
                      </button>
                      {item.status === 'DRAFT' ? (
                        <button className="btn ghost" onClick={() => actions.handleApproveStocktake(item.id)}>Duyệt</button>
                      ) : (
                        <span className="muted-text">Đã duyệt</span>
                      )}
                    </div>
                  </div>
                  {expandedStocktakes[item.id] && (
                    <div className="stocktake-detail">
                      <div className="stocktake-meta">
                        <span>Ghi chú: {item.note || '---'}</span>
                        <span>Nguyên liệu: {state.stocktakeItemsById[item.id]?.length ?? 0}</span>
                      </div>
                      {state.stocktakeItemLoading[item.id] && (
                        <div className="muted-text">Đang tải chi tiết...</div>
                      )}
                      {!state.stocktakeItemLoading[item.id] && (
                        <div className="table stocktake-items">
                          <div className="table-row head">
                            <span>Nguyên liệu</span>
                            <span>Hệ thống</span>
                            <span>Thực tế</span>
                            <span>Chênh lệch</span>
                          </div>
                          {(state.stocktakeItemsById[item.id] || []).map(row => (
                            <div key={row.id} className="table-row">
                              <span>{row.ingredient_name || row.ingredient_id}</span>
                              <span>{row.system_qty}</span>
                              <span>{row.actual_qty}</span>
                              <span>{row.delta_qty}</span>
                            </div>
                          ))}
                          {(state.stocktakeItemsById[item.id] || []).length === 0 && (
                            <div className="empty">Chưa có dòng kiểm kê.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {state.stocktakes.length === 0 && <div className="empty">Chưa có phiếu kiểm kê.</div>}
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
              {state.inventoryTx.length === 0 && (
                <div className="empty">Chưa có giao dịch kho.</div>
              )}
            </div>
          </div>
          </div>
        </>
      )}
    </section>
  );
}
