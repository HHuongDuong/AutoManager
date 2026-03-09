module.exports = function createBranchAccess(deps) {
  const { getAllowedBranchIds } = deps;

  async function ensureBranchAccess(req, branchId) {
    if (req.user?.permissions?.includes('RBAC_MANAGE')) return true;
    if (!branchId) return false;
    if (!req.allowedBranches) req.allowedBranches = await getAllowedBranchIds(req.user.sub);
    return req.allowedBranches.includes(branchId);
  }

  function branchFilter({ queryKey = 'branch_id', column = 'branch_id' } = {}) {
    return async (req, res, next) => {
      try {
        const branchId = req.query?.[queryKey] || null;
        if (branchId) {
          if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
          req.branchFilter = {
            where: `WHERE ${column} = $1`,
            params: [branchId],
            branchId,
            branchIds: [branchId]
          };
          return next();
        }
        if (req.user?.permissions?.includes('RBAC_MANAGE')) {
          req.branchFilter = { where: '', params: [], branchId: null, branchIds: [] };
          return next();
        }
        const allowed = await getAllowedBranchIds(req.user.sub);
        if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
        req.branchFilter = {
          where: `WHERE ${column} = ANY($1)`,
          params: [allowed],
          branchId: null,
          branchIds: allowed
        };
        return next();
      } catch (err) {
        return res.status(500).json({ error: 'branch_filter_failed', detail: err.message });
      }
    };
  }

  function requireBranchBody({ bodyKey = 'branch_id', required = false, error = 'branch_id_required' } = {}) {
    return async (req, res, next) => {
      try {
        const branchId = req.body?.[bodyKey] || null;
        if (!branchId) {
          if (required) return res.status(400).json({ error });
          return next();
        }
        if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
        req.branchId = branchId;
        return next();
      } catch (err) {
        return res.status(500).json({ error: 'branch_body_failed', detail: err.message });
      }
    };
  }

  function requireResourceBranch(getBranchId, { notFoundError = 'not_found' } = {}) {
    return async (req, res, next) => {
      try {
        const branchId = await getBranchId(req);
        if (!branchId) return res.status(404).json({ error: notFoundError });
        if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
        req.resourceBranchId = branchId;
        return next();
      } catch (err) {
        return res.status(500).json({ error: 'branch_resource_failed', detail: err.message });
      }
    };
  }

  return {
    ensureBranchAccess,
    branchFilter,
    requireBranchBody,
    requireResourceBranch
  };
};
