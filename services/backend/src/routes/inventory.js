const express = require('express');

module.exports = function createInventoryRouter(deps) {
  const {
    db,
    randomUUID,
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
    getStocktakeBranchId,
    getIngredientBranchOnHand,
    writeAuditLog,
    publishRealtime
  } = deps;

  const router = express.Router();

  router.get('/inventory/categories', authenticate, requirePermission('INVENTORY_VIEW'), async (req, res) => {
    const result = await db.query('SELECT id, name, created_at FROM inventory_categories ORDER BY name');
    return res.json(result.rows);
  });

  router.post('/inventory/categories', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryCategoryCreateSchema), async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const existsRes = await db.query('SELECT 1 FROM inventory_categories WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'inventory_category_exists' });
    const result = await db.query('INSERT INTO inventory_categories (id, name) VALUES ($1, $2) RETURNING id, name, created_at', [randomUUID(), name]);
    await writeAuditLog(req, 'INVENTORY_CATEGORY_CREATE', 'inventory_category', result.rows[0].id, { name });
    publishRealtime('inventory.category.created', result.rows[0], null);
    return res.status(201).json(result.rows[0]);
  });

  router.patch('/inventory/categories/:id', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryCategoryPatchSchema), async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await db.query('UPDATE inventory_categories SET name = $2 WHERE id = $1 RETURNING id, name, created_at', [req.params.id, name]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INVENTORY_CATEGORY_UPDATE', 'inventory_category', req.params.id, { name });
    publishRealtime('inventory.category.updated', result.rows[0], null);
    return res.json(result.rows[0]);
  });

  router.delete('/inventory/categories/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
    const result = await db.query('DELETE FROM inventory_categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INVENTORY_CATEGORY_DELETE', 'inventory_category', req.params.id, {});
    publishRealtime('inventory.category.deleted', { id: req.params.id }, null);
    return res.json({ deleted: true });
  });

  router.get('/ingredients', authenticate, requirePermission('INVENTORY_VIEW'), async (req, res) => {
    const { category_id } = req.query || {};
    const params = [];
    const filters = [];
    if (category_id) {
      params.push(category_id);
      filters.push(`i.category_id = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT i.id, i.name, i.unit, i.category_id, c.name AS category_name
       FROM ingredients i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       ${where}
       ORDER BY i.name`,
      params
    );
    return res.json(result.rows);
  });

  router.post('/ingredients', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(ingredientCreateSchema), async (req, res) => {
    const { name, unit, category_id } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const existsRes = await db.query(
      'SELECT 1 FROM ingredients WHERE name = $1 AND (category_id IS NOT DISTINCT FROM $2)',
      [name, category_id || null]
    );
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'ingredient_exists' });
    const result = await db.query(
      'INSERT INTO ingredients (id, name, unit, category_id) VALUES ($1, $2, $3, $4) RETURNING id, name, unit, category_id',
      [randomUUID(), name, unit || null, category_id || null]
    );
    await writeAuditLog(req, 'INGREDIENT_CREATE', 'ingredient', result.rows[0].id, { name, unit, category_id: category_id || null });
    publishRealtime('ingredient.created', result.rows[0], null);
    return res.status(201).json(result.rows[0]);
  });

  router.patch('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(ingredientPatchSchema), async (req, res) => {
    const { name, unit, category_id } = req.body || {};
    const result = await db.query(
      'UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit), category_id = COALESCE($4, category_id) WHERE id = $1 RETURNING id, name, unit, category_id',
      [req.params.id, name ?? null, unit ?? null, category_id ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INGREDIENT_UPDATE', 'ingredient', req.params.id, req.body);
    publishRealtime('ingredient.updated', result.rows[0], null);
    return res.json(result.rows[0]);
  });

  router.delete('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
    const result = await db.query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'INGREDIENT_DELETE', 'ingredient', req.params.id, {});
    publishRealtime('ingredient.deleted', { id: req.params.id }, null);
    return res.json({ deleted: true });
  });

  router.get('/inventory/inputs', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), async (req, res) => {
    const { ingredient_id, from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [`transaction_type = 'IN'`];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, branch_id, ingredient_id, quantity, unit_cost, (quantity * COALESCE(unit_cost, 0)) AS total_cost, reason, created_by, created_at
       FROM inventory_transactions ${where} ORDER BY created_at DESC`,
      params
    );
    return res.json(result.rows);
  });

  router.post('/inventory/inputs', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        if (!item.ingredient_id || qty === 0) continue;
        const row = await client.query(
          'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
          [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'IN', reason || null, req.user.sub]
        );
        results.push(row.rows[0]);
      }
      await client.query('COMMIT');
      await writeAuditLog(req, 'INVENTORY_INPUT_CREATE', 'inventory_input', null, { branch_id, count: results.length });
      publishRealtime('inventory.input.created', { branch_id, count: results.length }, branch_id);
      return res.status(201).json({ created: results.length, items: results });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'input_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.get('/inventory/transactions', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), async (req, res) => {
    const { ingredient_id, from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(`SELECT * FROM inventory_transactions ${where} ORDER BY created_at DESC`, params);
    return res.json(result.rows);
  });

  router.post('/inventory/transactions', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryTransactionCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, ingredient_id, order_id, quantity, transaction_type, reason, unit_cost } = req.body || {};
    if (!branch_id || !ingredient_id || !transaction_type) return res.status(400).json({ error: 'branch_ingredient_type_required' });
    const qty = Number(quantity || 0);
    if (qty === 0) return res.status(400).json({ error: 'quantity_required' });
    const result = await db.query(
      'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_at',
      [randomUUID(), branch_id, ingredient_id, order_id || null, qty, unit_cost || null, transaction_type, reason || null, req.user.sub]
    );
    await writeAuditLog(req, 'INVENTORY_TX_CREATE', 'inventory_transaction', result.rows[0].id, { branch_id, ingredient_id, transaction_type, quantity: qty });
    publishRealtime('inventory.transaction.created', result.rows[0], branch_id);
    return res.status(201).json(result.rows[0]);
  });

  router.post('/inventory/receipts', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        if (!item.ingredient_id || qty === 0) continue;
        const row = await client.query(
          'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
          [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'IN', reason || null, req.user.sub]
        );
        results.push(row.rows[0]);
      }
      await client.query('COMMIT');
      publishRealtime('inventory.receipt.created', { branch_id, count: results.length }, branch_id);
      return res.status(201).json({ created: results.length, items: results });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'receipt_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/inventory/issues', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        if (!item.ingredient_id || qty === 0) continue;
        const row = await client.query(
          'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
          [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'OUT', reason || null, req.user.sub]
        );
        results.push(row.rows[0]);
      }
      await client.query('COMMIT');
      publishRealtime('inventory.issue.created', { branch_id, count: results.length }, branch_id);
      return res.status(201).json({ created: results.length, items: results });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'issue_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/inventory/adjustments', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(inventoryBatchSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [], reason } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        if (!item.ingredient_id || qty === 0) continue;
        const row = await client.query(
          'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
          [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'ADJUST', reason || null, req.user.sub]
        );
        results.push(row.rows[0]);
      }
      await client.query('COMMIT');
      publishRealtime('inventory.adjustment.created', { branch_id, count: results.length }, branch_id);
      return res.status(201).json({ created: results.length, items: results });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'adjustment_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.get('/stocktakes', authenticate, requirePermission('INVENTORY_VIEW'), branchFilter(), async (req, res) => {
    const { status, from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    if (status) { params.push(status); filters.push(`status = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, branch_id, status, note, created_by, approved_by, created_at, approved_at
       FROM stocktakes ${where} ORDER BY created_at DESC`,
      params
    );
    return res.json(result.rows);
  });

  router.get('/stocktakes/:id/items', authenticate, requirePermission('INVENTORY_VIEW'), requireResourceBranch(req => getStocktakeBranchId(req.params.id)), async (req, res) => {
    const result = await db.query(
      `SELECT si.id, si.stocktake_id, si.ingredient_id, i.name AS ingredient_name, si.system_qty, si.actual_qty, si.delta_qty
       FROM stocktake_items si
       LEFT JOIN ingredients i ON i.id = si.ingredient_id
       WHERE si.stocktake_id = $1 ORDER BY i.name`,
      [req.params.id]
    );
    return res.json(result.rows);
  });

  router.post('/stocktakes', authenticate, requirePermission('INVENTORY_MANAGE'), validateBody(stocktakeCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [], note } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const ingredientIds = items.map(i => i.ingredient_id).filter(Boolean);
    const onHandMap = await getIngredientBranchOnHand(branch_id, ingredientIds);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const stocktakeId = randomUUID();
      await client.query(
        'INSERT INTO stocktakes (id, branch_id, status, note, created_by) VALUES ($1, $2, $3, $4, $5)',
        [stocktakeId, branch_id, 'DRAFT', note || null, req.user.sub]
      );
      const createdItems = [];
      for (const item of items) {
        if (!item.ingredient_id) continue;
        const actual = Number(item.actual_qty || 0);
        const system = onHandMap.get(item.ingredient_id) ?? 0;
        const delta = Number(actual - system);
        const row = await client.query(
          `INSERT INTO stocktake_items (id, stocktake_id, ingredient_id, system_qty, actual_qty, delta_qty)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, stocktake_id, ingredient_id, system_qty, actual_qty, delta_qty`,
          [randomUUID(), stocktakeId, item.ingredient_id, system, actual, delta]
        );
        createdItems.push(row.rows[0]);
      }
      await client.query('COMMIT');
      const headerRes = await db.query(
        'SELECT id, branch_id, status, note, created_by, created_at FROM stocktakes WHERE id = $1',
        [stocktakeId]
      );
      await writeAuditLog(req, 'STOCKTAKE_CREATE', 'stocktake', stocktakeId, { branch_id, count: createdItems.length });
      publishRealtime('inventory.stocktake.created', { id: stocktakeId, branch_id }, branch_id);
      return res.status(201).json({ ...headerRes.rows[0], items: createdItems });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'stocktake_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/stocktakes/:id/approve', authenticate, requirePermission('INVENTORY_MANAGE'), requireResourceBranch(req => getStocktakeBranchId(req.params.id)), async (req, res) => {
    const header = await db.query('SELECT id, branch_id, status FROM stocktakes WHERE id = $1', [req.params.id]);
    const stocktake = header.rows[0];
    if (!stocktake) return res.status(404).json({ error: 'not_found' });
    if (stocktake.status !== 'DRAFT') return res.status(409).json({ error: 'invalid_status' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemsRes = await client.query('SELECT ingredient_id, delta_qty FROM stocktake_items WHERE stocktake_id = $1', [req.params.id]);
      for (const item of itemsRes.rows) {
        const delta = Number(item.delta_qty || 0);
        if (delta === 0) continue;
        await client.query(
          `INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [randomUUID(), stocktake.branch_id, item.ingredient_id, delta, null, 'ADJUST', `STOCKTAKE:${req.params.id}`, req.user.sub]
        );
      }
      await client.query(
        'UPDATE stocktakes SET status = $2, approved_by = $3, approved_at = now() WHERE id = $1',
        [req.params.id, 'APPROVED', req.user.sub]
      );
      await client.query('COMMIT');
      await writeAuditLog(req, 'STOCKTAKE_APPROVE', 'stocktake', req.params.id, { branch_id: stocktake.branch_id });
      publishRealtime('inventory.stocktake.approved', { id: req.params.id, branch_id: stocktake.branch_id }, stocktake.branch_id);
      return res.json({ approved: true, id: req.params.id });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'stocktake_approve_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  return router;
};
