module.exports = function createAuditLogsService(deps) {
  const { db } = deps;

  async function listAuditLogs(filter) {
    const { user_id, action, from, to, limit, branchIds } = filter;
    const params = [];
    const filters = [];

    if (user_id) { params.push(user_id); filters.push(`user_id = $${params.length}`); }
    if (action) { params.push(action); filters.push(`action = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    if (Array.isArray(branchIds) && branchIds.length > 0) {
      params.push(branchIds);
      filters.push(`branch_id = ANY($${params.length})`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const cap = Math.max(1, Math.min(Number(limit || 100), 500));
    params.push(cap);

    const result = await db.query(
      `SELECT id, user_id, action, object_type, object_id, payload, branch_id, request_id, method, path, ip, user_agent, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows;
  }

  return { listAuditLogs };
};
