const express = require('express');

module.exports = function createTablesRouter(deps) {
  const {
    db,
    randomUUID,
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    getTableBranchId,
    writeAuditLog,
    publishRealtime
  } = deps;

  const router = express.Router();

  router.get('/tables', authenticate, branchFilter(), async (req, res) => {
    const { where, params } = req.branchFilter || { where: '', params: [] };
    const result = await db.query(`SELECT id, branch_id, name, status FROM tables ${where} ORDER BY name`, params);
    return res.json(result.rows);
  });

  router.post('/tables', authenticate, requirePermission('TABLE_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, name, status } = req.body || {};
    if (!branch_id || !name) return res.status(400).json({ error: 'branch_id_name_required' });
    const existsRes = await db.query('SELECT 1 FROM tables WHERE branch_id = $1 AND name = $2', [branch_id, name]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'table_exists' });
    const result = await db.query(
      'INSERT INTO tables (id, branch_id, name, status) VALUES ($1, $2, $3, $4) RETURNING id, branch_id, name, status',
      [randomUUID(), branch_id, name, status || 'AVAILABLE']
    );
    await writeAuditLog(req, 'TABLE_CREATE', 'table', result.rows[0].id, { name, branch_id });
    publishRealtime('table.created', result.rows[0], branch_id);
    return res.status(201).json(result.rows[0]);
  });

  router.patch('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), async (req, res) => {
    const { name, status } = req.body || {};
    const result = await db.query(
      'UPDATE tables SET name = COALESCE($2, name), status = COALESCE($3, status) WHERE id = $1 RETURNING id, branch_id, name, status',
      [req.params.id, name ?? null, status ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_UPDATE', 'table', req.params.id, req.body);
    publishRealtime('table.updated', result.rows[0], req.resourceBranchId);
    return res.json(result.rows[0]);
  });

  router.delete('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), async (req, res) => {
    const result = await db.query('DELETE FROM tables WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_DELETE', 'table', req.params.id, {});
    publishRealtime('table.deleted', { id: req.params.id }, req.resourceBranchId);
    return res.json({ deleted: true });
  });

  router.patch('/tables/:id/status', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), async (req, res) => {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status_required' });
    const result = await db.query('UPDATE tables SET status = $2 WHERE id = $1 RETURNING id, branch_id, name, status', [req.params.id, status]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_STATUS_UPDATE', 'table', req.params.id, { status });
    publishRealtime('table.status', { id: req.params.id, status }, req.resourceBranchId);
    return res.json(result.rows[0]);
  });

  return router;
};
