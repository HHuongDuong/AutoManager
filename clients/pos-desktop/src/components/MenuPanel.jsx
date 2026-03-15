export default function MenuPanel({
  search,
  onSearchChange,
  onClearSearch,
  categories,
  categoryId,
  onSelectCategory,
  products,
  loading,
  onAddToCart,
  formatVnd
}) {
  return (
    <section className="menu-panel">
      <div className="search-row">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tim mon, SKU..."
        />
        <button className="btn ghost" onClick={onClearSearch}>Xoa</button>
      </div>
      <div className="segmented">
        <button
          className={categoryId ? 'btn ghost' : 'btn primary'}
          onClick={() => onSelectCategory('')}
        >
          Tat ca nhom
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={categoryId === cat.id ? 'btn primary' : 'btn ghost'}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="menu-grid">
        {loading && <div className="card">Dang tai mon...</div>}
        {!loading && products.length === 0 && (
          <div className="card">Khong co du lieu mon.</div>
        )}
        {products.map(product => (
          <button key={product.id || product.name} className="menu-item" onClick={() => onAddToCart(product)}>
            <div>
              <h3>{product.name}</h3>
              <p>{product.sku || '---'}</p>
            </div>
            <strong>{formatVnd(product.price)}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
