const createInventoryService = require('../services/inventoryService');

module.exports = function createInventoryController(deps) {
  const {
    writeAuditLog,
    publishRealtime
  } = deps;

  const inventoryService = createInventoryService(deps);

  async function listCategories(req, res) {
    const rows = await inventoryService.listCategories();
    return res.json(rows);
  }

  async function createCategory(req, res) {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await inventoryService.createCategory(name);
    if (result?.error === 'inventory_category_exists') return res.status(409).json({ error: 'inventory_category_exists' });
    await writeAuditLog(req, 'INVENTORY_CATEGORY_CREATE', 'inventory_category', result.id, { name });
    publishRealtime('inventory.category.created', result, null);
    return res.status(201).json(result);
  }

  async function updateCategory(req, res) {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await inventoryService.updateCategory(req.params.id, name);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INVENTORY_CATEGORY_UPDATE', 'inventory_category', req.params.id, { name });
    publishRealtime('inventory.category.updated', result, null);
    return res.json(result);
  }

  async function deleteCategory(req, res) {
    const result = await inventoryService.deleteCategory(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INVENTORY_CATEGORY_DELETE', 'inventory_category', req.params.id, {});
    publishRealtime('inventory.category.deleted', { id: req.params.id }, null);
    return res.json({ deleted: true });
  }

  async function listIngredients(req, res) {
    const categoryId = req.query?.category_id || null;
    const branchId = req.query?.branch_id || null;
    const rows = await inventoryService.listIngredients(categoryId, branchId, req.branchFilter);
    return res.json(rows);
  }

  async function createIngredient(req, res) {
    const { name, unit, category_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await inventoryService.createIngredient({ name, unit, category_id });
    if (result?.error === 'ingredient_exists') return res.status(409).json({ error: 'ingredient_exists' });
    await writeAuditLog(req, 'INGREDIENT_CREATE', 'ingredient', result.id, { name, unit, category_id: category_id || null });
    publishRealtime('ingredient.created', result, null);
    return res.status(201).json(result);
  }

  async function updateIngredient(req, res) {
    const { name, unit, category_id } = req.body || {};
    const result = await inventoryService.updateIngredient(req.params.id, { name, unit, category_id });
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INGREDIENT_UPDATE', 'ingredient', req.params.id, req.body);
    publishRealtime('ingredient.updated', result, null);
    return res.json(result);
  }

  async function deleteIngredient(req, res) {
    const result = await inventoryService.deleteIngredient(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INGREDIENT_DELETE', 'ingredient', req.params.id, {});
    publishRealtime('ingredient.deleted', { id: req.params.id }, null);
    return res.json({ deleted: true });
  }

  async function listInputs(req, res) {
    const { ingredient_id, from, to } = req.query || {};
    const rows = await inventoryService.listInputs({ branchFilter: req.branchFilter, ingredient_id, from, to });
    return res.json(rows);
  }

  async function suggestReorderNextDay(req, res) {
    const { branch_id } = req.body || {};
    console.log('[ai] inventory reorder request', { branch_id });
    if (!branch_id) return res.status(400).json({ error: 'branch_required' });
    const result = await inventoryService.suggestReorderNextDay({ branch_id });
    if (result?.error === 'ai_not_configured') return res.status(503).json({ error: 'ai_not_configured' });
    if (result?.error === 'ai_invalid_response') return res.status(502).json({ error: 'ai_invalid_response' });
    if (result?.error === 'ai_provider_error') return res.status(502).json({ error: 'ai_provider_error', status: result.status || null });
    if (result?.error === 'branch_required') return res.status(400).json({ error: 'branch_required' });
    console.log('[ai] inventory reorder response', { branch_id, count: result.suggestions?.length || 0 });
    await writeAuditLog(req, 'AI_INVENTORY_REORDER', 'inventory', null, { branch_id, count: result.suggestions?.length || 0 });
    return res.json(result);
  }

  async function createInputs(req, res) {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    try {
      const result = await inventoryService.createBatchTransactions({ branch_id, items, reason }, 'IN', req.user.sub);
      await writeAuditLog(req, 'INVENTORY_INPUT_CREATE', 'inventory_input', null, { branch_id, count: result.items.length });
      publishRealtime('inventory.input.created', { branch_id, count: result.items.length }, branch_id);
      return res.status(201).json({ created: result.items.length, items: result.items });
    } catch (err) {
      return res.status(500).json({ error: 'input_create_failed', detail: err.message });
    }
  }

  async function listTransactions(req, res) {
    const { ingredient_id, from, to } = req.query || {};
    const rows = await inventoryService.listTransactions({ branchFilter: req.branchFilter, ingredient_id, from, to });
    return res.json(rows);
  }

  async function createTransaction(req, res) {
    const { branch_id, ingredient_id, order_id, quantity, transaction_type, reason, unit_cost } = req.body || {};
    if (!branch_id || !ingredient_id || !transaction_type) return res.status(400).json({ error: 'branch_ingredient_type_required' });
    const qty = Number(quantity || 0);
    if (qty === 0) return res.status(400).json({ error: 'quantity_required' });
    const result = await inventoryService.createTransaction({ branch_id, ingredient_id, order_id, quantity, transaction_type, reason, unit_cost }, req.user.sub);
    await writeAuditLog(req, 'INVENTORY_TX_CREATE', 'inventory_transaction', result.id, { branch_id, ingredient_id, transaction_type, quantity: qty });
    publishRealtime('inventory.transaction.created', result, branch_id);
    return res.status(201).json(result);
  }

  async function createReceipt(req, res) {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    try {
      const result = await inventoryService.createBatchTransactions({ branch_id, items, reason }, 'IN', req.user.sub);
      publishRealtime('inventory.receipt.created', { branch_id, count: result.items.length }, branch_id);
      return res.status(201).json({ created: result.items.length, items: result.items });
    } catch (err) {
      return res.status(500).json({ error: 'receipt_create_failed', detail: err.message });
    }
  }

  async function createIssue(req, res) {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    try {
      const result = await inventoryService.createBatchTransactions({ branch_id, items, reason }, 'OUT', req.user.sub);
      publishRealtime('inventory.issue.created', { branch_id, count: result.items.length }, branch_id);
      return res.status(201).json({ created: result.items.length, items: result.items });
    } catch (err) {
      return res.status(500).json({ error: 'issue_create_failed', detail: err.message });
    }
  }

  async function createAdjustment(req, res) {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    try {
      const result = await inventoryService.createBatchTransactions({ branch_id, items, reason }, 'ADJUST', req.user.sub);
      publishRealtime('inventory.adjustment.created', { branch_id, count: result.items.length }, branch_id);
      return res.status(201).json({ created: result.items.length, items: result.items });
    } catch (err) {
      return res.status(500).json({ error: 'adjustment_create_failed', detail: err.message });
    }
  }

  async function listStocktakes(req, res) {
    const { status, from, to } = req.query || {};
    const rows = await inventoryService.listStocktakes({ branchFilter: req.branchFilter, status, from, to });
    return res.json(rows);
  }

  async function listStocktakeItems(req, res) {
    const rows = await inventoryService.listStocktakeItems(req.params.id);
    return res.json(rows);
  }

  async function createStocktake(req, res) {
    const { branch_id, items = [], note } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    try {
      const result = await inventoryService.createStocktake({ branch_id, items, note }, req.user.sub);
      await writeAuditLog(req, 'STOCKTAKE_CREATE', 'stocktake', result.header.id, { branch_id, count: result.items.length });
      publishRealtime('inventory.stocktake.created', { id: result.header.id, branch_id }, branch_id);
      return res.status(201).json({ ...result.header, items: result.items });
    } catch (err) {
      return res.status(500).json({ error: 'stocktake_create_failed', detail: err.message });
    }
  }

  async function approveStocktake(req, res) {
    try {
      const result = await inventoryService.approveStocktake(req.params.id, req.user.sub);
      if (result?.error === 'not_found') return res.status(404).json({ error: 'not_found' });
      if (result?.error === 'invalid_status') return res.status(409).json({ error: 'invalid_status' });
      await writeAuditLog(req, 'STOCKTAKE_APPROVE', 'stocktake', req.params.id, { branch_id: result.stocktake.branch_id });
      publishRealtime('inventory.stocktake.approved', { id: req.params.id, branch_id: result.stocktake.branch_id }, result.stocktake.branch_id);
      return res.json({ approved: true, id: req.params.id });
    } catch (err) {
      return res.status(500).json({ error: 'stocktake_approve_failed', detail: err.message });
    }
  }

  return {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    listInputs,
    suggestReorderNextDay,
    createInputs,
    listTransactions,
    createTransaction,
    createReceipt,
    createIssue,
    createAdjustment,
    listStocktakes,
    listStocktakeItems,
    createStocktake,
    approveStocktake
  };
};
