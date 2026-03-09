const express = require('express');
const createOrdersController = require('../controllers/ordersController');

module.exports = function createOrdersRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody,
    requireResourceBranch,
    validateBody,
    orderCreateSchema,
    orderItemAddSchema,
    orderItemPatchSchema,
    orderPaymentSchema,
    getOrderBranchId
  } = deps;

  const controller = createOrdersController(deps);
  const router = express.Router();

  router.post('/orders', authenticate, requirePermission('ORDERS_CREATE'), validateBody(orderCreateSchema), requireBranchBody(), controller.createOrder);
  router.get('/orders', authenticate, requirePermission('ORDERS_VIEW'), branchFilter(), controller.listOrders);
  router.delete('/orders/:id', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.cancelOrder);
  router.get('/orders/:id', authenticate, requirePermission('ORDERS_VIEW'), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.getOrder);
  router.post('/orders/:id/items', authenticate, requirePermission('ORDERS_UPDATE'), validateBody(orderItemAddSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.addItem);
  router.patch('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), validateBody(orderItemPatchSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.updateItem);
  router.delete('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.deleteItem);
  router.post('/orders/:id/payments', authenticate, requirePermission('ORDERS_PAY'), validateBody(orderPaymentSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.addPayment);
  router.post('/orders/:id/close', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), controller.closeOrder);

  return router;
};
