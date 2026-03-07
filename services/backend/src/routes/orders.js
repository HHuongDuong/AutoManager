const express = require('express');

module.exports = function createOrdersRouter(deps) {
  const {
    db,
    randomUUID,
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
    updateOrderTotal,
    computeTotal,
    writeAuditLog,
    publishRealtime,
    getOrderById,
    issueEInvoiceForOrder,
    getOrderBranchId
  } = deps;

  const router = express.Router();

  router.post('/orders', authenticate, requirePermission('ORDERS_CREATE'), validateBody(orderCreateSchema), requireBranchBody(), async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];
    const { client_id, branch_id, created_by, order_type, table_id, items = [], payments = [], metadata } = req.body || {};
    const createdBy = created_by || req.user?.sub || null;
    if (!branch_id || !order_type) return res.status(400).json({ error: 'branch_id_and_order_type_required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items_required' });
    if (order_type === 'DINE_IN' && !table_id) return res.status(400).json({ error: 'table_id_required_for_dine_in' });

    if (idempotencyKey) {
      const existing = await db.query('SELECT order_id FROM idempotency_keys WHERE key = $1 AND (expires_at IS NULL OR expires_at > now())', [idempotencyKey]);
      if (existing.rows.length > 0 && existing.rows[0].order_id) {
        const order = await getOrderById(existing.rows[0].order_id);
        if (order) return res.status(200).json(order);
      }
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderId = randomUUID();
      const total = computeTotal(items);
      const paidAmount = Array.isArray(payments)
        ? payments.reduce((sum, pay) => sum + Number(pay?.amount || 0), 0)
        : 0;
      const paymentStatus = paidAmount >= total && total > 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
      const orderStatus = paymentStatus === 'PAID' ? 'PAID' : 'OPEN';
      await client.query(
        'INSERT INTO orders (id, branch_id, client_id, created_by, order_type, table_id, total_amount, payment_status, order_status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [orderId, branch_id, client_id || null, createdBy, order_type, table_id || null, total, paymentStatus, orderStatus, metadata || null]
      );
      if (order_type === 'DINE_IN' && table_id) {
        await client.query("UPDATE tables SET status = 'OCCUPIED' WHERE id = $1", [table_id]);
      }

      for (const item of items) {
        const itemId = randomUUID();
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || 0);
        const subtotal = quantity * unitPrice;
        await client.query(
          'INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [itemId, orderId, item.product_id || null, item.name || null, quantity, unitPrice, subtotal]
        );
      }

      const paymentIds = [];
      if (Array.isArray(payments)) {
        for (const pay of payments) {
          const payId = randomUUID();
          await client.query(
            'INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata) VALUES ($1, $2, $3, $4, $5)',
            [payId, orderId, Number(pay.amount || 0), pay.payment_method || 'CASH', pay.provider_metadata || null]
          );
          paymentIds.push(payId);
        }
      }

      if (idempotencyKey) {
        await client.query(
          'INSERT INTO idempotency_keys (key, order_id, expires_at) VALUES ($1, $2, now() + interval \'2 hours\') ON CONFLICT DO NOTHING',
          [idempotencyKey, orderId]
        );
      }

      await client.query('COMMIT');
      await writeAuditLog(req, 'ORDER_CREATE', 'order', orderId, { branch_id, total, items: items.length, payments: paymentIds.length });
      publishRealtime('order.created', { id: orderId, branch_id }, branch_id);
      const order = await getOrderById(orderId);
      if (paymentStatus === 'PAID') await issueEInvoiceForOrder(req, order);
      return res.status(201).json(order);
    } catch (err) {
      await client.query('ROLLBACK');
      await writeAuditLog(req, 'ORDER_CREATE_FAILED', 'order', null, {
        error: err.message,
        code: err?.code,
        constraint: err?.constraint,
        table: err?.table,
        column: err?.column
      });
      return res.status(500).json({ error: 'order_create_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.get('/orders', authenticate, requirePermission('ORDERS_VIEW'), branchFilter(), async (req, res) => {
    const { from, to, status } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    if (status) { params.push(status); filters.push(`order_status = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params);
    return res.json(result.rows);
  });

  router.delete('/orders/:id', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: 'reason_required' });
    const orderRes = await db.query('SELECT branch_id, payment_status, table_id, order_status FROM orders WHERE id = $1', [req.params.id]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (order.payment_status === 'PAID') return res.status(409).json({ error: 'already_paid' });
    if (order.order_status === 'CANCELLED') return res.status(409).json({ error: 'already_cancelled' });
    await db.query('UPDATE orders SET order_status = $2, updated_at = now() WHERE id = $1', [req.params.id, 'CANCELLED']);
    if (order.table_id) {
      await db.query("UPDATE tables SET status = 'AVAILABLE' WHERE id = $1", [order.table_id]);
    }
    await writeAuditLog(req, 'ORDER_CANCEL', 'order', req.params.id, { reason });
    publishRealtime('order.cancelled', { id: req.params.id, reason }, order.branch_id);
    return res.json({ cancelled: true });
  });

  router.get('/orders/:id', authenticate, requirePermission('ORDERS_VIEW'), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found' });
    return res.json(order);
  });

  router.post('/orders/:id/items', authenticate, requirePermission('ORDERS_UPDATE'), validateBody(orderItemAddSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const { product_id, name, quantity, unit_price } = req.body || {};
    if (!product_id && !name) return res.status(400).json({ error: 'product_or_name_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemId = randomUUID();
      const qty = Number(quantity || 1);
      const price = Number(unit_price || 0);
      const subtotal = qty * price;
      await client.query(
        'INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [itemId, req.params.id, product_id || null, name || null, qty, price, subtotal]
      );
      const total = await updateOrderTotal(client, req.params.id);
      await writeAuditLog(req, 'ORDER_ITEM_ADD', 'order', req.params.id, { item_id: itemId });
      await client.query('COMMIT');
      return res.status(201).json({ id: itemId, order_id: req.params.id, total_amount: total });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'order_item_add_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.patch('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), validateBody(orderItemPatchSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const { quantity, unit_price } = req.body || {};
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemRes = await client.query('SELECT quantity, unit_price FROM order_items WHERE id = $1 AND order_id = $2', [req.params.itemId, req.params.id]);
      if (itemRes.rows.length === 0) return res.status(404).json({ error: 'not_found' });
      const qty = quantity != null ? Number(quantity) : Number(itemRes.rows[0].quantity);
      const price = unit_price != null ? Number(unit_price) : Number(itemRes.rows[0].unit_price);
      const subtotal = qty * price;
      await client.query(
        'UPDATE order_items SET quantity = $3, unit_price = $4, subtotal = $5 WHERE id = $1 AND order_id = $2',
        [req.params.itemId, req.params.id, qty, price, subtotal]
      );
      const total = await updateOrderTotal(client, req.params.id);
      await writeAuditLog(req, 'ORDER_ITEM_UPDATE', 'order', req.params.id, { item_id: req.params.itemId });
      await client.query('COMMIT');
      return res.json({ id: req.params.itemId, order_id: req.params.id, total_amount: total });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'order_item_update_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.delete('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('DELETE FROM order_items WHERE id = $1 AND order_id = $2 RETURNING id', [req.params.itemId, req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
      const total = await updateOrderTotal(client, req.params.id);
      await writeAuditLog(req, 'ORDER_ITEM_DELETE', 'order', req.params.id, { item_id: req.params.itemId });
      await client.query('COMMIT');
      return res.json({ deleted: true, total_amount: total });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'order_item_delete_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/orders/:id/payments', authenticate, requirePermission('ORDERS_PAY'), validateBody(orderPaymentSchema), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const { amount, payment_method, provider_metadata } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount_required' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const payId = randomUUID();
      await client.query(
        'INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata) VALUES ($1, $2, $3, $4, $5)',
        [payId, req.params.id, Number(amount), payment_method || 'CASH', provider_metadata || null]
      );
      const totalRes = await client.query('SELECT total_amount FROM orders WHERE id = $1', [req.params.id]);
      if (totalRes.rows.length === 0) return res.status(404).json({ error: 'order_not_found' });
      const paySumRes = await client.query('SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE order_id = $1', [req.params.id]);
      const paid = Number(paySumRes.rows[0].paid || 0);
      const total = Number(totalRes.rows[0].total_amount || 0);
      const status = paid >= total ? 'PAID' : 'PARTIAL';
      await client.query("UPDATE orders SET payment_status = $2, updated_at = now(), order_status = CASE WHEN $2 = 'PAID' THEN 'PAID' ELSE order_status END WHERE id = $1", [req.params.id, status]);
      await writeAuditLog(req, 'ORDER_PAY', 'order', req.params.id, { amount });
      await client.query('COMMIT');
      return res.status(201).json({ id: payId, order_id: req.params.id, paid, total, payment_status: status });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'payment_failed', detail: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/orders/:id/close', authenticate, requirePermission('ORDERS_UPDATE'), requireResourceBranch(req => getOrderBranchId(req.params.id)), async (req, res) => {
    const orderRes = await db.query('SELECT payment_status, table_id FROM orders WHERE id = $1', [req.params.id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    if (orderRes.rows[0].payment_status !== 'PAID') return res.status(409).json({ error: 'payment_required' });
    await db.query("UPDATE orders SET order_status = 'CLOSED', updated_at = now() WHERE id = $1", [req.params.id]);
    if (orderRes.rows[0].table_id) {
      await db.query("UPDATE tables SET status = 'AVAILABLE' WHERE id = $1", [orderRes.rows[0].table_id]);
    }
    await writeAuditLog(req, 'ORDER_CLOSE', 'order', req.params.id, {});
    const order = await getOrderById(req.params.id);
    await issueEInvoiceForOrder(req, order);
    return res.json({ closed: true });
  });

  return router;
};
