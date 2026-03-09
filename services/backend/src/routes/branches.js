const express = require('express');
const createBranchesController = require('../controllers/branchesController');

module.exports = function createBranchesRouter(deps) {
  const { authenticate, requirePermission, validateBody, branchCreateSchema, branchPatchSchema, branchLocationSchema } = deps;
  const router = express.Router();
  const controller = createBranchesController(deps);

  router.get('/branches', authenticate, controller.listBranches);
  router.get('/branches/:id', authenticate, controller.getBranch);
  router.post('/branches', authenticate, requirePermission('RBAC_MANAGE'), validateBody(branchCreateSchema), controller.createBranch);
  router.patch('/branches/:id', authenticate, requirePermission('RBAC_MANAGE'), validateBody(branchPatchSchema), controller.updateBranch);
  router.patch('/branches/:id/location', authenticate, requirePermission('RBAC_MANAGE'), validateBody(branchLocationSchema), controller.updateBranchLocation);
  router.delete('/branches/:id', authenticate, requirePermission('RBAC_MANAGE'), controller.deleteBranch);

  return router;
};
