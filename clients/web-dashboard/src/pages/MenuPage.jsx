import { useEffect } from 'react';
import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/DashboardContext';

export default function MenuPage() {
  const { state, actions, derived } = useDashboardContext();

  useEffect(() => {
    if (!state.token) return;
    actions.fetchMenuData();
  }, [state.apiBase, state.branchId, state.categoryId, state.productSearch, state.token]);

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>Nhóm sản phẩm</h3>
          <span>{state.categories.length} nhóm</span>
        </div>
        <div className="form-row">
          <label>Tên nhóm</label>
          <input value={state.categoryName} onChange={(e) => actions.setCategoryName(e.target.value)} placeholder="Ví dụ: Đồ uống" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateCategory}>Tạo nhóm</button>
        <div className="list">
          {state.categories.map(cat => (
            <div key={cat.id} className="list-item">
              <div>
                <h4>{cat.name}</h4>
                <p>{cat.id}</p>
              </div>
              <div className="row-actions">
                <strong>Nhóm</strong>
                <button className="btn ghost" onClick={() => actions.handleDeleteCategory(cat.id)}>Xóa</button>
              </div>
            </div>
          ))}
          {state.categories.length === 0 && <div className="empty">Chưa có nhóm sản phẩm.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sách sản phẩm</h3>
          <span>{state.products.length} sản phẩm</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Tên sản phẩm</label>
            <input value={state.productForm.name} onChange={(e) => actions.setProductForm({ ...state.productForm, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>SKU</label>
            <input value={state.productForm.sku} onChange={(e) => actions.setProductForm({ ...state.productForm, sku: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Giá</label>
            <input value={state.productForm.price} onChange={(e) => actions.setProductForm({ ...state.productForm, price: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Nhóm</label>
            <select value={state.productForm.category_id} onChange={(e) => actions.setProductForm({ ...state.productForm, category_id: e.target.value })}>
              <option value="">Chưa phân loại</option>
              {state.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {state.productForm.id && (
            <div className="form-row">
              <label>Ảnh sản phẩm</label>
              <input type="file" accept="image/*" onChange={(e) => actions.setProductImageFile(e.target.files?.[0] || null)} />
              <button className="btn ghost" onClick={actions.handleUploadProductImage}>Upload ảnh</button>
            </div>
          )}
        </div>
        <div className="actions">
          {state.productForm.id ? (
            <>
              <button className="btn primary" onClick={actions.handleUpdateProduct}>Cập nhật</button>
              <button className="btn ghost" onClick={actions.resetProductForm}>Hủy</button>
            </>
          ) : (
            <button className="btn primary" onClick={actions.handleCreateProduct}>Tạo sản phẩm</button>
          )}
        </div>
        <div className="filter-row">
          <div className="form-row">
            <label>Nhóm</label>
            <select value={state.categoryId} onChange={(e) => actions.setCategoryId(e.target.value)}>
              <option value="">Tất cả</option>
              {state.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Tìm kiếm</label>
            <input value={state.productSearch} onChange={(e) => actions.setProductSearch(e.target.value)} placeholder="Tên món, SKU" />
          </div>
        </div>
        <div className="table">
          <div className="table-row head five">
            <span>Tên</span>
            <span>SKU</span>
            <span>Nhóm</span>
            <span>Giá</span>
            <span>Hành động</span>
          </div>
          {state.products.map(product => (
            <div key={product.id} className="table-row five">
              <span>
                <span className="product-name">
                  {product.image_url && <img src={`${state.apiBase}${product.image_url}`} alt={product.name} />}
                  <span>
                    {product.name}
                    {!product.is_active && <small className="muted-text">Đã khóa</small>}
                  </span>
                </span>
              </span>
              <span>{product.sku || '---'}</span>
              <span>{derived.categoryMap.get(product.category_id) || 'Chưa phân loại'}</span>
              <strong>
                {formatVnd(product.price)}
                {product.base_price != null && product.branch_price != null && (
                  <small className="muted-text">Gốc {formatVnd(product.base_price)}</small>
                )}
              </strong>
              <div className="row-actions">
                <button className="btn ghost" onClick={() => actions.handleEditProduct(product)}>Sửa</button>
                <button className="btn ghost" onClick={() => actions.handleToggleProductActive(product)}>
                  {product.is_active ? 'Khóa' : 'Mở'}
                </button>
              </div>
            </div>
          ))}
          {state.products.length === 0 && <div className="empty">Chưa có sản phẩm.</div>}
        </div>
      </div>
    </section>
  );
}
