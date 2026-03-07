const express = require('express');

module.exports = function createRbacRouter(deps) {
  const {
    db,
    randomUUID,
    authenticate,
    requirePermission,
    publishRealtime,
    validateBody,
    rbacRoleCreateSchema,
    rbacPermissionCreateSchema,
    rbacRolePermissionAddSchema,
    rbacUserRoleAddSchema,
    rbacUserBranchAddSchema
  } = deps;

  const router = express.Router();

  router.get('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
    const result = await db.query('SELECT id, name FROM roles ORDER BY name');
    return res.json(result.rows);
  });

  router.post('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacRoleCreateSchema), async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const existsRes = await db.query('SELECT 1 FROM roles WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'role_exists' });
    const result = await db.query('INSERT INTO roles (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
    publishRealtime('rbac.role.created', { id: result.rows[0].id, name: result.rows[0].name }, null);
    return res.status(201).json(result.rows[0]);
  });

  router.get('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
    const result = await db.query('SELECT id, code, description FROM permissions ORDER BY code');
    return res.json(result.rows);
  });

  router.post('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacPermissionCreateSchema), async (req, res) => {
    const { code, description } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code_required' });
    const existsRes = await db.query('SELECT 1 FROM permissions WHERE code = $1', [code]);
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'permission_exists' });
    const result = await db.query(
      'INSERT INTO permissions (id, code, description) VALUES ($1, $2, $3) RETURNING id, code, description',
      [randomUUID(), code, description || null]
    );
    publishRealtime('rbac.permission.created', { id: result.rows[0].id, code: result.rows[0].code }, null);
    return res.status(201).json(result.rows[0]);
  });

  router.post('/rbac/roles/:roleId/permissions', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacRolePermissionAddSchema), async (req, res) => {
    const { roleId } = req.params;
    const { permission_id } = req.body || {};
    if (!permission_id) return res.status(400).json({ error: 'permission_id_required' });
    const existsRes = await db.query(
      'SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permission_id]
    );
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'role_permission_exists' });
    await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, permission_id]);
    publishRealtime('rbac.role.permission.added', { role_id: roleId, permission_id }, null);
    return res.status(201).json({ role_id: roleId, permission_id });
  });

  router.delete('/rbac/roles/:roleId/permissions/:permissionId', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
    const { roleId, permissionId } = req.params;
    const result = await db.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleId, permissionId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    publishRealtime('rbac.role.permission.removed', { role_id: roleId, permission_id: permissionId }, null);
    return res.json({ deleted: true });
  });

  router.get('/rbac/roles/:roleId/permissions', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
    const { roleId } = req.params;
    const result = await db.query(
      `SELECT p.id, p.code, p.description
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.code`,
      [roleId]
    );
    return res.json(result.rows);
  });

  router.post('/rbac/users/:userId/roles', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacUserRoleAddSchema), async (req, res) => {
    const { userId } = req.params;
    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'role_id_required' });
    const existsRes = await db.query(
      'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, role_id]
    );
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'user_role_exists' });
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, role_id]);
    publishRealtime('rbac.user.role.added', { user_id: userId, role_id }, null);
    return res.status(201).json({ user_id: userId, role_id });
  });

  router.post('/rbac/users/:userId/branches', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacUserBranchAddSchema), async (req, res) => {
    const { userId } = req.params;
    const { branch_id } = req.body || {};
    if (!branch_id) return res.status(400).json({ error: 'branch_id_required' });
    const existsRes = await db.query(
      'SELECT 1 FROM user_branch_access WHERE user_id = $1 AND branch_id = $2',
      [userId, branch_id]
    );
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'user_branch_exists' });
    await db.query('INSERT INTO user_branch_access (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, branch_id]);
    publishRealtime('rbac.user.branch.added', { user_id: userId, branch_id }, branch_id);
    return res.status(201).json({ user_id: userId, branch_id });
  });

  return router;
};
