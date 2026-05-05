const express = require('express');
const createInventoryController = require('../controllers/inventoryController');

module.exports = function createInventoryRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    validateBody,
    inventoryCategoryCreateSchema,
    inventoryCategoryPatchSchema,
    ingredientCreateSchema,
    ingredientPatchSchema,
    inventoryBatchSchema,
    inventoryTransactionCreateSchema,
    stocktakeCreateSchema,
    getStocktakeBranchId
  } = deps;

  const router = express.Router();
  const controller = createInventoryController(deps);

  router.get('/inventory/categories', authenticate, requirePermission('INVENTORY_VIEW'), controller.listCategories);
  router.post('/inventory/categories', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryCategoryCreateSchema), controller.createCategory);
  router.patch('/inventory/categories/:id', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryCategoryPatchSchema), controller.updateCategory);
  router.delete('/inventory/categories/:id', authenticate, requirePermission('INVENTORY_MANAGE'), controller.deleteCategory);

  router.get('/ingredients', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), controller.listIngredients);
  router.post('/ingredients', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(ingredientCreateSchema), controller.createIngredient);
  router.patch('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(ingredientPatchSchema), controller.updateIngredient);
  router.delete('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), controller.deleteIngredient);

  router.get('/inventory/inputs', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), controller.listInputs);
  router.post('/inventory/ai-reorder', authenticate, requirePermission('INVENTORY_VIEW'), requireBranchBody({ bodyKey: 'branch_id' }), controller.suggestReorderNextDay);
  router.post('/inventory/inputs', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createInputs);

  router.get('/inventory/transactions', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), controller.listTransactions);
  router.post('/inventory/transactions', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryTransactionCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createTransaction);

  router.post('/inventory/receipts', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createReceipt);
  router.post('/inventory/issues', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createIssue);
  router.post('/inventory/adjustments', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createAdjustment);

  router.get('/stocktakes', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), controller.listStocktakes);
  router.get('/stocktakes/:id/items', authenticate, requirePermission('INVENTORY_VIEW'), requireResourceBranch(req => getStocktakeBranchId(req.params.id)), controller.listStocktakeItems);
  router.post('/stocktakes', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(stocktakeCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createStocktake);
  router.post('/stocktakes/:id/approve', authenticate, requirePermission('INVENTORY_MANAGE'), requireResourceBranch(req => getStocktakeBranchId(req.params.id)), controller.approveStocktake);

  return router;
};
