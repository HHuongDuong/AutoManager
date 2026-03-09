const createProductsService = require('../services/productsService');

module.exports = function createProductsController(deps) {
  const {
    writeAuditLog,
    publishRealtime,
    invalidateProductsCache,
    redisGet,
    redisSet
  } = deps;

  const productsService = createProductsService(deps);

  async function listCategories(req, res) {
    const rows = await productsService.listCategories();
    return res.json(rows);
  }

  async function createCategory(req, res) {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await productsService.createCategory(name);
    if (result?.error === 'category_exists') return res.status(409).json({ error: 'category_exists' });
    await writeAuditLog(req, 'CATEGORY_CREATE', 'product_category', result.id, { name });
    publishRealtime('product_category.created', { id: result.id, name }, null);
    await invalidateProductsCache();
    return res.status(201).json(result);
  }

  async function deleteCategory(req, res) {
    try {
      const result = await productsService.deleteCategory(req.params.id);
      if (!result) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'CATEGORY_DELETE', 'product_category', req.params.id, {});
      publishRealtime('product_category.deleted', { id: req.params.id }, null);
      await invalidateProductsCache();
      return res.json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: 'category_delete_failed', detail: err.message });
    }
  }

  async function listProducts(req, res) {
    const { branch_id, category_id, q } = req.query || {};
    const cacheKey = `products:${branch_id || 'all'}:${category_id || 'all'}:${q || ''}`;
    const cached = await redisGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const rows = await productsService.listProducts({ branchFilter: req.branchFilter, branch_id, category_id, q });
    await redisSet(cacheKey, JSON.stringify(rows), 60);
    return res.json(rows);
  }

  async function createProduct(req, res) {
    const { branch_id, category_id, sku, name, price, metadata, image_url } = req.body || {};
    if (!branch_id || !name || price == null) return res.status(400).json({ error: 'branch_id_name_price_required' });
    const result = await productsService.createProduct({ branch_id, category_id, sku, name, price, metadata, image_url });
    await writeAuditLog(req, 'PRODUCT_CREATE', 'product', result.id, { name, branch_id });
    publishRealtime('product.created', result, branch_id);
    await invalidateProductsCache();
    return res.status(201).json(result);
  }

  async function updateProduct(req, res) {
    const result = await productsService.updateProduct(req.params.id, req.body || {});
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'PRODUCT_UPDATE', 'product', req.params.id, req.body);
    publishRealtime('product.updated', result, req.resourceBranchId);
    await invalidateProductsCache();
    return res.json(result);
  }

  async function deleteProduct(req, res) {
    const result = await productsService.deleteProduct(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'PRODUCT_DELETE', 'product', req.params.id, {});
    publishRealtime('product.deleted', { id: req.params.id }, req.resourceBranchId);
    await invalidateProductsCache();
    return res.json({ deleted: true });
  }

  async function updateBranchPrice(req, res) {
    const { branch_id, price } = req.body || {};
    if (!branch_id || price == null) return res.status(400).json({ error: 'branch_id_price_required' });
    const result = await productsService.updateBranchPrice(req.params.id, { branch_id, price });
    if (result?.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'PRODUCT_BRANCH_PRICE_UPDATE', 'product', req.params.id, { branch_id, price: Number(price) });
    publishRealtime('product.branch_price.updated', result, branch_id);
    await invalidateProductsCache();
    return res.json(result);
  }

  async function updateProductImage(req, res) {
    try {
      if (!req.file?.filename) return res.status(400).json({ error: 'image_required' });
      const imageUrl = `/uploads/products/${req.file.filename}`;
      const result = await productsService.updateProductImage(req.params.id, imageUrl);
      await writeAuditLog(req, 'PRODUCT_IMAGE_UPDATE', 'product', req.params.id, { image_url: imageUrl });
      publishRealtime('product.image.updated', { id: req.params.id, image_url: imageUrl }, req.resourceBranchId);
      await invalidateProductsCache();
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'image_upload_failed', detail: err.message });
    }
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
