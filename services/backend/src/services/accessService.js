module.exports = function createAccessService(deps) {
  const { db } = deps;

  async function getUserRoles(userId) {
    const result = await db.query(
      'SELECT r.id, r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
      [userId]
    );
    return result.rows;
  }

  async function getUserPermissions(userId) {
    const result = await db.query(
      `SELECT DISTINCT p.code
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(r => r.code);
  }

  async function getAllowedBranchIds(userId) {
    const [empRes, accessRes] = await Promise.all([
      db.query('SELECT branch_id FROM employees WHERE user_id = $1', [userId]),
      db.query('SELECT branch_id FROM user_branch_access WHERE user_id = $1', [userId])
    ]);
    const branches = new Set();
    for (const row of empRes.rows) if (row.branch_id) branches.add(row.branch_id);
    for (const row of accessRes.rows) if (row.branch_id) branches.add(row.branch_id);
    return Array.from(branches);
  }

  return {
    getUserRoles,
    getUserPermissions,
    getAllowedBranchIds
  };
};
