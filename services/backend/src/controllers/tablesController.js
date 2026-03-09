const createTablesService = require('../services/tablesService');

module.exports = function createTablesController(deps) {
  const { writeAuditLog, publishRealtime } = deps;
  const tablesService = createTablesService(deps);

  async function listTables(req, res) {
    const rows = await tablesService.listTables({ branchFilter: req.branchFilter });
    return res.json(rows);
  }

  async function createTable(req, res) {
    const { branch_id, name, status } = req.body || {};
    if (!branch_id || !name) return res.status(400).json({ error: 'branch_id_name_required' });
    const result = await tablesService.createTable({ branch_id, name, status });
    if (result?.error === 'table_exists') return res.status(409).json({ error: 'table_exists' });
    await writeAuditLog(req, 'TABLE_CREATE', 'table', result.id, { name, branch_id });
    publishRealtime('table.created', result, branch_id);
    return res.status(201).json(result);
  }

  async function updateTable(req, res) {
    const result = await tablesService.updateTable(req.params.id, req.body || {});
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_UPDATE', 'table', req.params.id, req.body);
    publishRealtime('table.updated', result, req.resourceBranchId);
    return res.json(result);
  }

  async function deleteTable(req, res) {
    const result = await tablesService.deleteTable(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_DELETE', 'table', req.params.id, {});
    publishRealtime('table.deleted', { id: req.params.id }, req.resourceBranchId);
    return res.json({ deleted: true });
  }

  async function updateTableStatus(req, res) {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status_required' });
    const result = await tablesService.updateTableStatus(req.params.id, status);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'TABLE_STATUS_UPDATE', 'table', req.params.id, { status });
    publishRealtime('table.status', { id: req.params.id, status }, req.resourceBranchId);
    return res.json(result);
  }

  return {
    listTables,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus
  };
};
