const express = require('express');

module.exports = function createProductsRouter(deps) {
  const {
    db,
    randomUUID,
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    getProductBranchId,
    writeAuditLog,
    publishRealtime,
    invalidateProductsCache,
    upload,
    redisGet,
    redisSet
  } = deps;

  const router = express.Router();

  router.get('/product-categories', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
    const result = await db.query('SELECT id, name FROM product_categories ORDER BY name');
    return res.json(result.rows);
  });

  router.post('/product-categories', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const existsRes = await db.query('SELECT 1 FROM product_categories WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'category_exists' });
    const result = await db.query('INSERT INTO product_categories (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
    await writeAuditLog(req, 'CATEGORY_CREATE', 'product_category', result.rows[0].id, { name });
    publishRealtime('product_category.created', { id: result.rows[0].id, name }, null);
    return res.status(201).json(result.rows[0]);
  });

  router.delete('/product-categories/:id', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
    try {
      await db.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [req.params.id]);
      const result = await db.query('DELETE FROM product_categories WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'CATEGORY_DELETE', 'product_category', req.params.id, {});
      publishRealtime('product_category.deleted', { id: req.params.id }, null);
      await invalidateProductsCache();
      return res.json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: 'category_delete_failed', detail: err.message });
    }
  });

  router.get('/products', authenticate, requirePermission('PRODUCT_VIEW'), branchFilter({ column: 'p.branch_id' }), async (req, res) => {
    const { branch_id, category_id, q } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    if (category_id) { params.push(category_id); filters.push(`category_id = $${params.length}`); }
    if (q) { params.push(`%${q}%`); filters.push(`name ILIKE $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const cacheKey = `products:${branch_id || 'all'}:${category_id || 'all'}:${q || ''}`;
    const cached = await redisGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    if (branch_id) {
      const branchParamIndex = params.length + 1;
      const result = await db.query(
        `SELECT p.id, p.branch_id, p.category_id, p.sku, p.name,
                COALESCE(b.price, p.price) AS price,
                p.price AS base_price,
                b.price AS branch_price,
                p.image_url,
                p.metadata
         FROM products p
         LEFT JOIN product_branch_prices b ON b.product_id = p.id AND b.branch_id = $${branchParamIndex}
         ${where}
         ORDER BY p.name`,
        [...params, branch_id]
      );
      await redisSet(cacheKey, JSON.stringify(result.rows), 60);
      return res.json(result.rows);
    }
    const result = await db.query(
      `SELECT id, branch_id, category_id, sku, name, price,
              price AS base_price,
              NULL::numeric AS branch_price,
              image_url,
              metadata
       FROM products ${where} ORDER BY name`,
      params
    );
    await redisSet(cacheKey, JSON.stringify(result.rows), 60);
    return res.json(result.rows);
  });

  router.post('/products', authenticate, requirePermission('PRODUCT_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, category_id, sku, name, price, metadata, image_url } = req.body || {};
    if (!branch_id || !name || price == null) return res.status(400).json({ error: 'branch_id_name_price_required' });
    const result = await db.query(
      'INSERT INTO products (id, branch_id, category_id, sku, name, price, image_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, branch_id, category_id, sku, name, price, image_url, metadata',
      [randomUUID(), branch_id, category_id || null, sku || null, name, Number(price), image_url || null, metadata || null]
    );
    await writeAuditLog(req, 'PRODUCT_CREATE', 'product', result.rows[0].id, { name, branch_id });
    publishRealtime('product.created', result.rows[0], branch_id);
    await invalidateProductsCache();
    return res.status(201).json(result.rows[0]);
  });

  router.patch('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), async (req, res) => {
    const { category_id, sku, name, price, metadata, image_url } = req.body || {};
    const result = await db.query(
      'UPDATE products SET category_id = COALESCE($2, category_id), sku = COALESCE($3, sku), name = COALESCE($4, name), price = COALESCE($5, price), image_url = COALESCE($6, image_url), metadata = COALESCE($7, metadata) WHERE id = $1 RETURNING id, branch_id, category_id, sku, name, price, image_url, metadata',
      [req.params.id, category_id ?? null, sku ?? null, name ?? null, price ?? null, image_url ?? null, metadata ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'PRODUCT_UPDATE', 'product', req.params.id, req.body);
    publishRealtime('product.updated', result.rows[0], req.resourceBranchId);
    await invalidateProductsCache();
    return res.json(result.rows[0]);
  });

  router.delete('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), async (req, res) => {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'PRODUCT_DELETE', 'product', req.params.id, {});
    publishRealtime('product.deleted', { id: req.params.id }, req.resourceBranchId);
    await invalidateProductsCache();
    return res.json({ deleted: true });
  });

  router.put('/products/:id/branch-price', authenticate, requirePermission('PRODUCT_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, price } = req.body || {};
    if (!branch_id || price == null) return res.status(400).json({ error: 'branch_id_price_required' });
    const productRes = await db.query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (productRes.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const result = await db.query(
      `INSERT INTO product_branch_prices (product_id, branch_id, price)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, branch_id) DO UPDATE SET price = EXCLUDED.price, updated_at = now()
       RETURNING product_id, branch_id, price, updated_at`,
      [req.params.id, branch_id, Number(price)]
    );
    await writeAuditLog(req, 'PRODUCT_BRANCH_PRICE_UPDATE', 'product', req.params.id, { branch_id, price: Number(price) });
    publishRealtime('product.branch_price.updated', result.rows[0], branch_id);
    await invalidateProductsCache();
    return res.json(result.rows[0]);
  });

  router.post('/products/:id/image', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), upload.single('image'), async (req, res) => {
    try {
      if (!req.file?.filename) return res.status(400).json({ error: 'image_required' });
      const imageUrl = `/uploads/products/${req.file.filename}`;
      const result = await db.query(
        'UPDATE products SET image_url = $2 WHERE id = $1 RETURNING id, image_url',
        [req.params.id, imageUrl]
      );
      await writeAuditLog(req, 'PRODUCT_IMAGE_UPDATE', 'product', req.params.id, { image_url: imageUrl });
      publishRealtime('product.image.updated', { id: req.params.id, image_url: imageUrl }, req.resourceBranchId);
      await invalidateProductsCache();
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'image_upload_failed', detail: err.message });
    }
  });

  return router;
};
