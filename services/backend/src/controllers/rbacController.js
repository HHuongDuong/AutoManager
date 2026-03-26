const createRbacService = require('../services/rbacService');

module.exports = function createRbacController(deps) {
  const { publishRealtime } = deps;
  const rbacService = createRbacService(deps);

  async function listRoles(req, res) {
    const rows = await rbacService.listRoles();
    return res.json(rows);
  }

  async function createRole(req, res) {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name_required' });
    const result = await rbacService.createRole(name);
    if (result?.error === 'role_exists') return res.status(409).json({ error: 'role_exists' });
    publishRealtime('rbac.role.created', { id: result.id, name: result.name }, null);
    return res.status(201).json(result);
  }

  async function deleteRole(req, res) {
    const { roleId } = req.params;
    const deleted = await rbacService.deleteRole(roleId);
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    publishRealtime('rbac.role.deleted', { id: roleId }, null);
    return res.json({ deleted: true });
  }

  async function listPermissions(req, res) {
    const rows = await rbacService.listPermissions();
    return res.json(rows);
  }

  async function createPermission(req, res) {
    const { code, description } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code_required' });
    const result = await rbacService.createPermission({ code, description });
    if (result?.error === 'permission_exists') return res.status(409).json({ error: 'permission_exists' });
    publishRealtime('rbac.permission.created', { id: result.id, code: result.code }, null);
    return res.status(201).json(result);
  }

  async function addRolePermission(req, res) {
    const { roleId } = req.params;
    const { permission_id } = req.body || {};
    if (!permission_id) return res.status(400).json({ error: 'permission_id_required' });
    const result = await rbacService.addRolePermission(roleId, permission_id);
    if (result?.error === 'role_permission_exists') return res.status(409).json({ error: 'role_permission_exists' });
    publishRealtime('rbac.role.permission.added', { role_id: roleId, permission_id }, null);
    return res.status(201).json({ role_id: roleId, permission_id });
  }

  async function removeRolePermission(req, res) {
    const { roleId, permissionId } = req.params;
    const deleted = await rbacService.removeRolePermission(roleId, permissionId);
    if (!deleted) return res.status(404).json({ error: 'not_found' });
    publishRealtime('rbac.role.permission.removed', { role_id: roleId, permission_id: permissionId }, null);
    return res.json({ deleted: true });
  }

  async function listRolePermissions(req, res) {
    const { roleId } = req.params;
    const rows = await rbacService.listRolePermissions(roleId);
    return res.json(rows);
  }

  async function addUserRole(req, res) {
    const { userId } = req.params;
    const { role_id } = req.body || {};
    if (!role_id) return res.status(400).json({ error: 'role_id_required' });
    const result = await rbacService.addUserRole(userId, role_id);
    if (result?.error === 'user_role_exists') return res.status(409).json({ error: 'user_role_exists' });
    publishRealtime('rbac.user.role.added', { user_id: userId, role_id }, null);
    return res.status(201).json({ user_id: userId, role_id });
  }

  async function addUserBranch(req, res) {
    const { userId } = req.params;
    const { branch_id } = req.body || {};
    if (!branch_id) return res.status(400).json({ error: 'branch_id_required' });
    const result = await rbacService.addUserBranch(userId, branch_id);
    if (result?.error === 'user_branch_exists') return res.status(409).json({ error: 'user_branch_exists' });
    publishRealtime('rbac.user.branch.added', { user_id: userId, branch_id }, branch_id);
    return res.status(201).json({ user_id: userId, branch_id });
  }

  return {
    listRoles,
    createRole,
    deleteRole,
    listPermissions,
    createPermission,
    addRolePermission,
    removeRolePermission,
    listRolePermissions,
    addUserRole,
    addUserBranch
  };
};
