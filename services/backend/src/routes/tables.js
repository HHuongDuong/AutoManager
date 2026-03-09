const express = require('express');
const createTablesController = require('../controllers/tablesController');

module.exports = function createTablesRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    getTableBranchId
  } = deps;

  const router = express.Router();
  const controller = createTablesController(deps);

  router.get('/tables', authenticate, branchFilter(), controller.listTables);
  router.post('/tables', authenticate, requirePermission('TABLE_MANAGE'), requireBranchBody({ bodyKey: 'branch_id' }), controller.createTable);
  router.patch('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), controller.updateTable);
  router.delete('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), controller.deleteTable);
  router.patch('/tables/:id/status', authenticate, requirePermission('TABLE_MANAGE'), requireResourceBranch(req => getTableBranchId(req.params.id)), controller.updateTableStatus);

  return router;
};
