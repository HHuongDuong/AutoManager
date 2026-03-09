const express = require('express');
const createAuditLogsController = require('../controllers/auditLogsController');

module.exports = function createAuditLogsRouter(deps) {
  const { authenticate, requirePermission } = deps;
  const router = express.Router();
  const controller = createAuditLogsController(deps);

  router.get('/audit-logs', authenticate, requirePermission('AUDIT_VIEW'), controller.listAuditLogs);

  return router;
};
