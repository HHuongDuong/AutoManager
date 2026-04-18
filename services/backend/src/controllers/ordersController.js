const createOrdersService = require('../services/ordersService');

module.exports = function createOrdersController(deps) {
  const {
    writeAuditLog,
    publishRealtime,
    getOrderBranchId
  } = deps;

  const ordersService = createOrdersService(deps);

  async function createOrder(req, res) {
    const idempotencyKey = req.headers['idempotency-key'];
    const { client_id, branch_id, created_by, order_type, table_id, items = [], payments = [], metadata } = req.body || {};
    const createdBy = created_by || req.user?.sub || null;
    if (!branch_id || !order_type) return res.status(400).json({ error: 'branch_id_and_order_type_required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items_required' });
    if (order_type === 'DINE_IN' && !table_id) return res.status(400).json({ error: 'table_id_required_for_dine_in' });

    try {
      if (idempotencyKey) {
        const existingId = await ordersService.findOrderIdByIdempotencyKey(idempotencyKey);
        if (existingId) {
          const existingOrder = await ordersService.getOrderById(existingId);
          if (existingOrder) return res.status(200).json(existingOrder);
        }
      }

      const result = await ordersService.createOrder({
        idempotencyKey,
        client_id,
        branch_id,
        created_by: createdBy,
        order_type,
        table_id,
        items,
        payments,
        metadata,
        userId: req.user?.sub || null
      });

      await writeAuditLog(req, 'ORDER_CREATE', 'order', result.orderId, {
        branch_id,
        total: result.total,
        items: items.length,
        payments: result.paymentIds.length
      });
      publishRealtime('order.created', { id: result.orderId, branch_id }, branch_id);
      const order = await ordersService.getOrderById(result.orderId);
      return res.status(201).json(order);
    } catch (err) {
      await writeAuditLog(req, 'ORDER_CREATE_FAILED', 'order', null, {
        error: err.message,
        code: err?.code,
        constraint: err?.constraint,
        table: err?.table,
        column: err?.column
      });
      return res.status(500).json({ error: 'order_create_failed', detail: err.message });
    }
  }

  async function listOrders(req, res) {
    const { from, to, status } = req.query || {};
    const rows = await ordersService.listOrders({ branchFilter: req.branchFilter, status, from, to });
    return res.json(rows);
  }

  async function cancelOrder(req, res) {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: 'reason_required' });
    const result = await ordersService.cancelOrder(req.params.id);
    if (result?.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (result?.error === 'already_paid') return res.status(409).json({ error: 'already_paid' });
    if (result?.error === 'already_cancelled') return res.status(409).json({ error: 'already_cancelled' });
    await writeAuditLog(req, 'ORDER_CANCEL', 'order', req.params.id, { reason });
    publishRealtime('order.cancelled', { id: req.params.id, reason }, result.order.branch_id);
    return res.json({ cancelled: true });
  }

  async function getOrder(req, res) {
    const order = await ordersService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found' });
    return res.json(order);
  }

  async function addItem(req, res) {
    const { product_id, name, quantity, unit_price } = req.body || {};
    if (!product_id && !name) return res.status(400).json({ error: 'product_or_name_required' });
    try {
      const result = await ordersService.addOrderItem(req.params.id, { product_id, name, quantity, unit_price });
      await writeAuditLog(req, 'ORDER_ITEM_ADD', 'order', req.params.id, { item_id: result.itemId });
      const branchId = await getOrderBranchId(req.params.id);
      publishRealtime('order.updated', { id: req.params.id, item_id: result.itemId, total_amount: result.total }, branchId);
      return res.status(201).json({ id: result.itemId, order_id: req.params.id, total_amount: result.total });
    } catch (err) {
      return res.status(500).json({ error: 'order_item_add_failed', detail: err.message });
    }
  }

  async function updateItem(req, res) {
    const { quantity, unit_price } = req.body || {};
    try {
      const result = await ordersService.updateOrderItem(req.params.id, req.params.itemId, { quantity, unit_price });
      if (!result) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'ORDER_ITEM_UPDATE', 'order', req.params.id, { item_id: req.params.itemId });
      const branchId = await getOrderBranchId(req.params.id);
      publishRealtime('order.updated', { id: req.params.id, item_id: req.params.itemId, total_amount: result.total }, branchId);
      return res.json({ id: req.params.itemId, order_id: req.params.id, total_amount: result.total });
    } catch (err) {
      return res.status(500).json({ error: 'order_item_update_failed', detail: err.message });
    }
  }

  async function deleteItem(req, res) {
    try {
      const result = await ordersService.deleteOrderItem(req.params.id, req.params.itemId);
      if (!result) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'ORDER_ITEM_DELETE', 'order', req.params.id, { item_id: req.params.itemId });
      const branchId = await getOrderBranchId(req.params.id);
      publishRealtime('order.updated', { id: req.params.id, item_id: req.params.itemId, total_amount: result.total }, branchId);
      return res.json({ deleted: true, total_amount: result.total });
    } catch (err) {
      return res.status(500).json({ error: 'order_item_delete_failed', detail: err.message });
    }
  }

  async function addPayment(req, res) {
    const { amount, payment_method, provider_metadata } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount_required' });
    try {
      const result = await ordersService.addPayment(req.params.id, { amount, payment_method, provider_metadata });
      if (result?.error === 'order_not_found') return res.status(404).json({ error: 'order_not_found' });
      await writeAuditLog(req, 'ORDER_PAY', 'order', req.params.id, { amount });
      return res.status(201).json({ id: result.payId, order_id: req.params.id, paid: result.paid, total: result.total, payment_status: result.status });
    } catch (err) {
      return res.status(500).json({ error: 'payment_failed', detail: err.message });
    }
  }

  async function closeOrder(req, res) {
    const result = await ordersService.closeOrder(req.params.id);
    if (result?.error === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (result?.error === 'payment_required') return res.status(409).json({ error: 'payment_required' });
    await writeAuditLog(req, 'ORDER_CLOSE', 'order', req.params.id, {});
    const order = await ordersService.getOrderById(req.params.id);
    if (order?.branch_id) publishRealtime('order.closed', { id: req.params.id }, order.branch_id);
    return res.json({ closed: true });
  }

  return {
    createOrder,
    listOrders,
    cancelOrder,
    getOrder,
    addItem,
    updateItem,
    deleteItem,
    addPayment,
    closeOrder
  };
};
