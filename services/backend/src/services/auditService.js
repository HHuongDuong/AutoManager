module.exports = function createAuditService(deps) {
  const { db } = deps;

  async function writeAuditLog(req, action, objectType, objectId, payload) {
    const userId = req.user?.sub || null;
    const branchId = req.resourceBranchId || req.branchId || req.body?.branch_id || req.query?.branch_id || payload?.branch_id || null;
    const requestId = req.requestId || req.headers['x-request-id'] || null;
    const method = req.method || null;
    const path = req.originalUrl || req.path || null;
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;

    await db.query(
      `INSERT INTO audit_logs (user_id, action, object_type, object_id, payload, branch_id, request_id, method, path, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, action, objectType || null, objectId || null, payload || null, branchId, requestId, method, path, ip, userAgent]
    );
  }

  return { writeAuditLog };
};
