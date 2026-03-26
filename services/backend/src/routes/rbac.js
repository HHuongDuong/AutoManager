const express = require('express');
const createRbacController = require('../controllers/rbacController');

module.exports = function createRbacRouter(deps) {
  const {
    authenticate,
    requirePermission,
    validateBody,
    rbacRoleCreateSchema,
    rbacPermissionCreateSchema,
    rbacRolePermissionAddSchema,
    rbacUserRoleAddSchema,
    rbacUserBranchAddSchema
  } = deps;

  const router = express.Router();
  const controller = createRbacController(deps);

  router.get('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), controller.listRoles);
  router.post('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacRoleCreateSchema), controller.createRole);
  router.delete('/rbac/roles/:roleId', authenticate, requirePermission('RBAC_MANAGE'), controller.deleteRole);

  router.get('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), controller.listPermissions);
  router.post('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacPermissionCreateSchema), controller.createPermission);

  router.post('/rbac/roles/:roleId/permissions', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacRolePermissionAddSchema), controller.addRolePermission);
  router.delete('/rbac/roles/:roleId/permissions/:permissionId', authenticate, requirePermission('RBAC_MANAGE'), controller.removeRolePermission);
  router.get('/rbac/roles/:roleId/permissions', authenticate, requirePermission('RBAC_MANAGE'), controller.listRolePermissions);

  router.post('/rbac/users/:userId/roles', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacUserRoleAddSchema), controller.addUserRole);
  router.post('/rbac/users/:userId/branches', authenticate, requirePermission('RBAC_MANAGE'), validateBody(rbacUserBranchAddSchema), controller.addUserBranch);

  return router;
};
