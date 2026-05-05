const express = require('express');
const createProductsController = require('../controllers/productsController');

module.exports = function createProductsRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    getProductBranchId,
    upload
  } = deps;

  const router = express.Router();
  const controller = createProductsController(deps);

  const uploadProductImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'image_too_large', max_mb: 10 });
      }
      if (err.message === 'invalid_image_type') {
        return res.status(400).json({ error: 'invalid_image_type' });
      }
      return res.status(500).json({ error: 'image_upload_failed', detail: err.message });
    });
  };

  router.get('/product-categories', authenticate, requirePermission('PRODUCT_VIEW'), controller.listCategories);
  router.post('/product-categories', authenticate, requirePermission('PRODUCT_MANAGE'), controller.createCategory);
  router.delete('/product-categories/:id', authenticate, requirePermission('PRODUCT_MANAGE'), controller.deleteCategory);

  router.get('/products', authenticate, requirePermission('PRODUCT_VIEW'), branchFilter({ column: 'p.branch_id' }), controller.listProducts);
  router.post('/products', authenticate, requirePermission('PRODUCT_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), controller.createProduct);
  router.patch('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), controller.updateProduct);
  router.delete('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), controller.deleteProduct);
  router.put('/products/:id/branch-price', authenticate, requirePermission('PRODUCT_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), controller.updateBranchPrice);
  router.post('/products/:id/image', authenticate, requirePermission('PRODUCT_MANAGE'), requireResourceBranch(req => getProductBranchId(req.params.id)), uploadProductImage, controller.updateProductImage);

  return router;
};
