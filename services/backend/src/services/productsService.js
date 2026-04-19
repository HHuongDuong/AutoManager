module.exports = function createProductsService(deps) {
  const { db, randomUUID } = deps;

  async function listCategories() {
    const result = await db.query('SELECT id, name FROM product_categories ORDER BY name');
    return result.rows;
  }

  async function createCategory(name) {
    const existsRes = await db.query('SELECT 1 FROM product_categories WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return { error: 'category_exists' };
    const result = await db.query('INSERT INTO product_categories (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
    return result.rows[0];
  }

  async function deleteCategory(id) {
    await db.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [id]);
    const result = await db.query('DELETE FROM product_categories WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  async function listProducts(filter) {
    const { branchFilter, branch_id, category_id, q, include_inactive } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    if (!include_inactive) filters.push('p.is_active = TRUE');
    if (category_id) { params.push(category_id); filters.push(`p.category_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); filters.push(`p.name ILIKE $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    if (branch_id) {
      const branchParamIndex = params.length + 1;
      const result = await db.query(
        `SELECT p.id, p.branch_id, p.category_id, p.sku, p.name,
                COALESCE(b.price, p.price) AS price,
                p.price AS base_price,
                b.price AS branch_price,
                p.image_url,
                p.metadata,
                p.is_active
         FROM products p
         LEFT JOIN product_branch_prices b ON b.product_id = p.id AND b.branch_id = $${branchParamIndex}
         ${where}
         ORDER BY p.name`,
        [...params, branch_id]
      );
      return result.rows;
    }

    const result = await db.query(
      `SELECT p.id, p.branch_id, p.category_id, p.sku, p.name, p.price,
              p.price AS base_price,
              NULL::numeric AS branch_price,
              p.image_url,
              p.metadata,
              p.is_active
       FROM products p ${where} ORDER BY p.name`,
      params
    );
    return result.rows;
  }

  async function createProduct(payload) {
    const { branch_id, category_id, sku, name, price, metadata, image_url } = payload;
    const result = await db.query(
      'INSERT INTO products (id, branch_id, category_id, sku, name, price, image_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, branch_id, category_id, sku, name, price, image_url, metadata, is_active',
      [randomUUID(), branch_id, category_id || null, sku || null, name, Number(price), image_url || null, metadata || null]
    );
    return result.rows[0];
  }

  async function updateProduct(id, payload) {
    const { category_id, sku, name, price, metadata, image_url, is_active } = payload;
    const result = await db.query(
      'UPDATE products SET category_id = COALESCE($2, category_id), sku = COALESCE($3, sku), name = COALESCE($4, name), price = COALESCE($5, price), image_url = COALESCE($6, image_url), metadata = COALESCE($7, metadata), is_active = COALESCE($8, is_active) WHERE id = $1 RETURNING id, branch_id, category_id, sku, name, price, image_url, metadata, is_active',
      [id, category_id ?? null, sku ?? null, name ?? null, price ?? null, image_url ?? null, metadata ?? null, is_active ?? null]
    );
    return result.rows[0] || null;
  }

  async function deleteProduct(id) {
    const refCheck = await db.query('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [id]);
    if (refCheck.rows.length > 0) return { error: 'product_in_use' };
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  async function updateBranchPrice(productId, payload) {
    const { branch_id, price } = payload;
    const productRes = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productRes.rows.length === 0) return { error: 'not_found' };
    const result = await db.query(
      `INSERT INTO product_branch_prices (product_id, branch_id, price)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, branch_id) DO UPDATE SET price = EXCLUDED.price, updated_at = now()
       RETURNING product_id, branch_id, price, updated_at`,
      [productId, branch_id, Number(price)]
    );
    return result.rows[0];
  }

  async function updateProductImage(productId, imageUrl) {
    const result = await db.query(
      'UPDATE products SET image_url = $2 WHERE id = $1 RETURNING id, image_url',
      [productId, imageUrl]
    );
    return result.rows[0] || null;
  }

  return {
    listCategories,
    createCategory,
    deleteCategory,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateBranchPrice,
    updateProductImage
  };
};
