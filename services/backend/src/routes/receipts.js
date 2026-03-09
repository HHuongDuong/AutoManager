const express = require('express');
const createReceiptsController = require('../controllers/receiptsController');

module.exports = function createReceiptsRouter(deps) {
  const { authenticate, requirePermission } = deps;
  const router = express.Router();
  const controller = createReceiptsController(deps);

  router.post('/receipts/format', authenticate, requirePermission('ORDERS_READ'), controller.formatReceipt);

  return router;
};
