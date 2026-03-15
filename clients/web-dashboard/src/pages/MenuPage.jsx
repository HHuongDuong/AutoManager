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
          <h3>Nhom san pham</h3>
          <span>{state.categories.length} nhom</span>
        </div>
        <div className="form-row">
          <label>Ten nhom</label>
          <input value={state.categoryName} onChange={(e) => actions.setCategoryName(e.target.value)} placeholder="Vi du: Do uong" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateCategory}>Tao nhom</button>
        <div className="list">
          {state.categories.map(cat => (
            <div key={cat.id} className="list-item">
              <div>
                <h4>{cat.name}</h4>
                <p>{cat.id}</p>
              </div>
              <div className="row-actions">
                <strong>Nhom</strong>
                <button className="btn ghost" onClick={() => actions.handleDeleteCategory(cat.id)}>Xoa</button>
              </div>
            </div>
          ))}
          {state.categories.length === 0 && <div className="empty">Chua co nhom san pham.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sach san pham</h3>
          <span>{state.products.length} san pham</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Ten san pham</label>
            <input value={state.productForm.name} onChange={(e) => actions.setProductForm({ ...state.productForm, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>SKU</label>
            <input value={state.productForm.sku} onChange={(e) => actions.setProductForm({ ...state.productForm, sku: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Gia</label>
            <input value={state.productForm.price} onChange={(e) => actions.setProductForm({ ...state.productForm, price: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Nhom</label>
            <select value={state.productForm.category_id} onChange={(e) => actions.setProductForm({ ...state.productForm, category_id: e.target.value })}>
              <option value="">Chua phan loai</option>
              {state.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {state.branchId && (
            <div className="form-row">
              <label>Gia theo chi nhanh</label>
              <input value={state.branchPrice} onChange={(e) => actions.setBranchPrice(e.target.value)} placeholder="Gia tai chi nhanh" />
            </div>
          )}
          {state.productForm.id && (
            <div className="form-row">
              <label>Anh san pham</label>
              <input type="file" accept="image/*" onChange={(e) => actions.setProductImageFile(e.target.files?.[0] || null)} />
              <button className="btn ghost" onClick={actions.handleUploadProductImage}>Upload anh</button>
            </div>
          )}
        </div>
        <div className="actions">
          {state.productForm.id ? (
            <>
              <button className="btn primary" onClick={actions.handleUpdateProduct}>Cap nhat</button>
              <button className="btn ghost" onClick={actions.resetProductForm}>Huy</button>
            </>
          ) : (
            <button className="btn primary" onClick={actions.handleCreateProduct}>Tao san pham</button>
          )}
        </div>
        <div className="filter-row">
          <div className="form-row">
            <label>Nhom</label>
            <select value={state.categoryId} onChange={(e) => actions.setCategoryId(e.target.value)}>
              <option value="">Tat ca</option>
              {state.categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Tim kiem</label>
            <input value={state.productSearch} onChange={(e) => actions.setProductSearch(e.target.value)} placeholder="Ten mon, SKU" />
          </div>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ten</span>
            <span>SKU</span>
            <span>Nhom</span>
            <span>Gia</span>
            <span>Hanh dong</span>
          </div>
          {state.products.map(product => (
            <div key={product.id} className="table-row five">
              <span>
                <span className="product-name">
                  {product.image_url && <img src={`${state.apiBase}${product.image_url}`} alt={product.name} />}
                  {product.name}
                </span>
              </span>
              <span>{product.sku || '---'}</span>
              <span>{derived.categoryMap.get(product.category_id) || 'Chua phan loai'}</span>
              <strong>
                {formatVnd(product.price)}
                {product.base_price != null && product.branch_price != null && (
                  <small className="muted-text">Goc {formatVnd(product.base_price)}</small>
                )}
              </strong>
              <div className="row-actions">
                <button className="btn ghost" onClick={() => actions.handleEditProduct(product)}>Sua</button>
                <button className="btn ghost" onClick={() => actions.handleDeleteProduct(product)}>Xoa</button>
              </div>
            </div>
          ))}
          {state.products.length === 0 && <div className="empty">Chua co san pham.</div>}
        </div>
      </div>
    </section>
  );
}
