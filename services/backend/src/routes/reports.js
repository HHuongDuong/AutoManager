const express = require('express');
const createReportsController = require('../controllers/reportsController');

module.exports = function createReportsRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter
  } = deps;

  const router = express.Router();
  const controller = createReportsController(deps);

  router.get('/reports/revenue', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), controller.listRevenue);
  router.get('/reports/revenue/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), controller.exportRevenue);

  router.get('/reports/inventory', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), controller.listInventory);
  router.get('/reports/inventory/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), controller.exportInventory);

  router.get('/reports/attendance', authenticate, requirePermission('REPORT_VIEW'), branchFilter({ column: 'a.branch_id' }), controller.listAttendance);
  router.get('/reports/attendance/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter({ column: 'a.branch_id' }), controller.exportAttendance);

  return router;
};
