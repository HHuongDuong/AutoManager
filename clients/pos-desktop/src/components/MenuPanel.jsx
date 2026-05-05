export default function MenuPanel({
  apiBase,
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
  const resolveImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    return `${apiBase}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  };

  return (
    <section className="menu-panel">
      <div className="search-row">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm món, SKU..."
        />
        <button className="btn ghost" onClick={onClearSearch}>Xóa</button>
      </div>
      <div className="segmented">
        <button
          className={categoryId ? 'btn ghost' : 'btn primary'}
          onClick={() => onSelectCategory('')}
        >
          Tất cả nhóm
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
        {loading && <div className="card">Đang tải món...</div>}
        {!loading && products.length === 0 && (
          <div className="card">Không có dữ liệu món.</div>
        )}
        {products.map(product => (
          <button key={product.id || product.name} className="menu-item" onClick={() => onAddToCart(product)}>
            <div className="menu-item-media">
              {product.image_url ? (
                <img
                  className="menu-item-image"
                  src={resolveImageUrl(product.image_url)}
                  alt={product.name}
                  loading="lazy"
                />
              ) : (
                <div className="menu-item-placeholder" aria-hidden="true">
                  {String(product.name || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="menu-item-copy">
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
