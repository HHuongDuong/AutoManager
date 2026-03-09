const createAuditLogsService = require('../services/auditLogsService');

module.exports = function createAuditLogsController(deps) {
  const { getAllowedBranchIds } = deps;
  const auditLogsService = createAuditLogsService(deps);

  async function listAuditLogs(req, res) {
    const { user_id, action, from, to, limit } = req.query || {};
    const isAdmin = req.user?.permissions?.includes('RBAC_MANAGE');
    const branchIds = isAdmin ? null : await getAllowedBranchIds(req.user.sub);
    if (!isAdmin && (!branchIds || branchIds.length === 0)) return res.status(403).json({ error: 'branch_forbidden' });

    const rows = await auditLogsService.listAuditLogs({
      user_id,
      action,
      from,
      to,
      limit,
      branchIds
    });
    return res.json(rows);
  }

  return { listAuditLogs };
};
