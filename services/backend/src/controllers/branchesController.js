const createBranchesService = require('../services/branchesService');

module.exports = function createBranchesController(deps) {
  const { getAllowedBranchIds, writeAuditLog, publishRealtime } = deps;
  const branchesService = createBranchesService(deps);

  async function listBranches(req, res) {
    const isAdmin = req.user?.permissions?.includes('RBAC_MANAGE');
    const allowed = isAdmin ? null : await getAllowedBranchIds(req.user.sub);
    if (!isAdmin && (!allowed || allowed.length === 0)) return res.status(403).json({ error: 'branch_forbidden' });
    const rows = await branchesService.listBranches(allowed);
    return res.json(rows);
  }

  async function getBranch(req, res) {
    const branch = await branchesService.getBranchById(req.params.id);
    if (!branch) return res.status(404).json({ error: 'not_found' });
    const isAdmin = req.user?.permissions?.includes('RBAC_MANAGE');
    if (!isAdmin) {
      const allowed = await getAllowedBranchIds(req.user.sub);
      if (!allowed.includes(branch.id)) return res.status(403).json({ error: 'branch_forbidden' });
    }
    return res.json(branch);
  }

  async function createBranch(req, res) {
    const { name, address } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await branchesService.createBranch({ name, address });
    await writeAuditLog(req, 'BRANCH_CREATE', 'branch', result.id, { name });
    publishRealtime('branch.created', result, result.id);
    return res.status(201).json(result);
  }

  async function updateBranch(req, res) {
    const result = await branchesService.updateBranch(req.params.id, req.body || {});
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'BRANCH_UPDATE', 'branch', req.params.id, req.body);
    publishRealtime('branch.updated', result, result.id);
    return res.json(result);
  }

  async function updateBranchLocation(req, res) {
    const { latitude, longitude } = req.body || {};
    if (latitude == null || longitude == null) return res.status(400).json({ error: 'location_required' });
    const result = await branchesService.updateBranchLocation(req.params.id, { latitude, longitude });
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'BRANCH_LOCATION_UPDATE', 'branch', req.params.id, { latitude, longitude });
    publishRealtime('branch.location.updated', { id: req.params.id, latitude, longitude }, result.id);
    return res.json(result);
  }

  async function deleteBranch(req, res) {
    const result = await branchesService.deleteBranch(req.params.id);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'BRANCH_DELETE', 'branch', req.params.id, {});
    publishRealtime('branch.deleted', { id: req.params.id }, req.params.id);
    return res.json({ deleted: true });
  }

  return {
    listBranches,
    getBranch,
    createBranch,
    updateBranch,
    updateBranchLocation,
    deleteBranch
  };
};
