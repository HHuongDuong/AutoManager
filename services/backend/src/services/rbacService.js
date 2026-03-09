module.exports = function createRbacService(deps) {
  const { db, randomUUID } = deps;

  async function listRoles() {
    const result = await db.query('SELECT id, name FROM roles ORDER BY name');
    return result.rows;
  }

  async function createRole(name) {
    const existsRes = await db.query('SELECT 1 FROM roles WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return { error: 'role_exists' };
    const result = await db.query('INSERT INTO roles (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
    return result.rows[0];
  }

  async function listPermissions() {
    const result = await db.query('SELECT id, code, description FROM permissions ORDER BY code');
    return result.rows;
  }

  async function createPermission(payload) {
    const { code, description } = payload;
    const existsRes = await db.query('SELECT 1 FROM permissions WHERE code = $1', [code]);
    if (existsRes.rows.length > 0) return { error: 'permission_exists' };
    const result = await db.query(
      'INSERT INTO permissions (id, code, description) VALUES ($1, $2, $3) RETURNING id, code, description',
      [randomUUID(), code, description || null]
    );
    return result.rows[0];
  }

  async function addRolePermission(roleId, permissionId) {
    const existsRes = await db.query(
      'SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );
    if (existsRes.rows.length > 0) return { error: 'role_permission_exists' };
    await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, permissionId]);
    return { role_id: roleId, permission_id: permissionId };
  }

  async function removeRolePermission(roleId, permissionId) {
    const result = await db.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleId, permissionId]);
    return result.rowCount > 0;
  }

  async function listRolePermissions(roleId) {
    const result = await db.query(
      `SELECT p.id, p.code, p.description
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.code`,
      [roleId]
    );
    return result.rows;
  }

  async function addUserRole(userId, roleId) {
    const existsRes = await db.query(
      'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    if (existsRes.rows.length > 0) return { error: 'user_role_exists' };
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    return { user_id: userId, role_id: roleId };
  }

  async function addUserBranch(userId, branchId) {
    const existsRes = await db.query(
      'SELECT 1 FROM user_branch_access WHERE user_id = $1 AND branch_id = $2',
      [userId, branchId]
    );
    if (existsRes.rows.length > 0) return { error: 'user_branch_exists' };
    await db.query('INSERT INTO user_branch_access (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, branchId]);
    return { user_id: userId, branch_id: branchId };
  }

  return {
    listRoles,
    createRole,
    listPermissions,
    createPermission,
    addRolePermission,
    removeRolePermission,
    listRolePermissions,
    addUserRole,
    addUserBranch
  };
};
