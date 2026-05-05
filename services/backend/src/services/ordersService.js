module.exports = function createOrdersService(deps) {
  const {
    db,
    randomUUID
  } = deps;

  async function syncTableAvailability(client, tableId) {
    if (!tableId) return;
    const activeOrderRes = await client.query(
      `SELECT 1
       FROM orders
       WHERE table_id = $1
         AND order_type = 'DINE_IN'
         AND order_status NOT IN ('CANCELLED', 'CLOSED')
       LIMIT 1`,
      [tableId]
    );
    const nextStatus = activeOrderRes.rows.length > 0 ? 'OCCUPIED' : 'AVAILABLE';
    await client.query('UPDATE tables SET status = $2 WHERE id = $1', [tableId, nextStatus]);
    return nextStatus;
  }

  async function updateOrderTotal(client, orderId) {
    const result = await client.query('SELECT COALESCE(SUM(subtotal), 0) AS total FROM order_items WHERE order_id = $1', [orderId]);
    const total = Number(result.rows[0].total || 0);
    await client.query('UPDATE orders SET total_amount = $2, updated_at = now() WHERE id = $1', [orderId, total]);
    return total;
  }

  function computeTotal(items = []) {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);
      return sum + qty * price;
    }, 0);
  }

  async function getOrderById(orderId) {
    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) return null;
    const order = orderRes.rows[0];
    const itemsRes = await db.query(
      'SELECT id, order_id, product_id, name, quantity, unit_price, subtotal FROM order_items WHERE order_id = $1 ORDER BY id',
      [orderId]
    );
    const paymentsRes = await db.query(
      'SELECT id, order_id, amount, payment_method, provider_metadata, created_at FROM payments WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );
    return { ...order, items: itemsRes.rows, payments: paymentsRes.rows };
  }

  async function findOrderIdByIdempotencyKey(key) {
    const existing = await db.query(
      'SELECT order_id FROM idempotency_keys WHERE key = $1 AND (expires_at IS NULL OR expires_at > now())',
      [key]
    );
    return existing.rows[0]?.order_id || null;
  }

  async function createOrder(payload) {
    const {
      idempotencyKey,
      client_id,
      branch_id,
      created_by,
      order_type,
      table_id,
      items,
      payments,
      metadata,
      userId
    } = payload;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      if (order_type === 'DINE_IN' && table_id) {
        const tableRes = await client.query(
          'SELECT id, branch_id FROM tables WHERE id = $1 FOR UPDATE',
          [table_id]
        );
        if (tableRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return { error: 'table_not_found' };
        }
        if (tableRes.rows[0].branch_id !== branch_id) {
          await client.query('ROLLBACK');
          return { error: 'table_branch_mismatch' };
        }

        const conflictRes = await client.query(
          `SELECT id
           FROM orders
           WHERE table_id = $1
             AND branch_id = $2
             AND order_type = 'DINE_IN'
             AND order_status NOT IN ('CANCELLED', 'CLOSED')
           LIMIT 1`,
          [table_id, branch_id]
        );
        if (conflictRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return { error: 'table_occupied', open_order_id: conflictRes.rows[0].id };
        }
      }

      const orderId = randomUUID();
      const total = computeTotal(items);
      const paidAmount = Array.isArray(payments)
        ? payments.reduce((sum, pay) => sum + Number(pay?.amount || 0), 0)
        : 0;
      const paymentStatus = paidAmount >= total && total > 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
      const orderStatus = paymentStatus === 'PAID' ? 'PAID' : 'OPEN';
      let tableStatus = null;
      await client.query(
        'INSERT INTO orders (id, branch_id, client_id, created_by, order_type, table_id, total_amount, payment_status, order_status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [orderId, branch_id, client_id || null, created_by, order_type, table_id || null, total, paymentStatus, orderStatus, metadata || null]
      );
      if (order_type === 'DINE_IN' && table_id) {
        tableStatus = await syncTableAvailability(client, table_id);
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
      return { orderId, paymentStatus, paymentIds, total, tableId: table_id || null, tableStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function listOrders(filter) {
    const { branchFilter, status, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    if (status) { params.push(status); filters.push(`order_status = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params);
    return result.rows;
  }

  async function cancelOrder(orderId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        'SELECT branch_id, payment_status, table_id, order_status FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      const order = orderRes.rows[0] || null;
      if (!order) {
        await client.query('ROLLBACK');
        return { error: 'not_found' };
      }
      if (order.payment_status === 'PAID') {
        await client.query('ROLLBACK');
        return { error: 'already_paid' };
      }
      if (order.order_status === 'CANCELLED') {
        await client.query('ROLLBACK');
        return { error: 'already_cancelled' };
      }

      await client.query('UPDATE orders SET order_status = $2, updated_at = now() WHERE id = $1', [orderId, 'CANCELLED']);
      const tableStatus = await syncTableAvailability(client, order.table_id);
      await client.query('COMMIT');
      return { order, tableId: order.table_id || null, tableStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function addOrderItem(orderId, payload) {
    const { product_id, name, quantity, unit_price } = payload;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemId = randomUUID();
      const qty = Number(quantity || 1);
      const price = Number(unit_price || 0);
      const subtotal = qty * price;
      await client.query(
        'INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [itemId, orderId, product_id || null, name || null, qty, price, subtotal]
      );
      const total = await updateOrderTotal(client, orderId);
      await client.query('COMMIT');
      return { itemId, total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function updateOrderItem(orderId, itemId, payload) {
    const { quantity, unit_price } = payload;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemRes = await client.query('SELECT quantity, unit_price FROM order_items WHERE id = $1 AND order_id = $2', [itemId, orderId]);
      if (itemRes.rows.length === 0) return null;
      const qty = quantity != null ? Number(quantity) : Number(itemRes.rows[0].quantity);
      const price = unit_price != null ? Number(unit_price) : Number(itemRes.rows[0].unit_price);
      const subtotal = qty * price;
      await client.query(
        'UPDATE order_items SET quantity = $3, unit_price = $4, subtotal = $5 WHERE id = $1 AND order_id = $2',
        [itemId, orderId, qty, price, subtotal]
      );
      const total = await updateOrderTotal(client, orderId);
      await client.query('COMMIT');
      return { total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function deleteOrderItem(orderId, itemId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('DELETE FROM order_items WHERE id = $1 AND order_id = $2 RETURNING id', [itemId, orderId]);
      if (result.rows.length === 0) return null;
      const total = await updateOrderTotal(client, orderId);
      await client.query('COMMIT');
      return { total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function addPayment(orderId, payload) {
    const { amount, payment_method, provider_metadata } = payload;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const payId = randomUUID();
      await client.query(
        'INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata) VALUES ($1, $2, $3, $4, $5)',
        [payId, orderId, Number(amount), payment_method || 'CASH', provider_metadata || null]
      );
      const totalRes = await client.query('SELECT total_amount FROM orders WHERE id = $1', [orderId]);
      if (totalRes.rows.length === 0) return { error: 'order_not_found' };
      const paySumRes = await client.query('SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE order_id = $1', [orderId]);
      const paid = Number(paySumRes.rows[0].paid || 0);
      const total = Number(totalRes.rows[0].total_amount || 0);
      const status = paid >= total ? 'PAID' : 'PARTIAL';
      await client.query("UPDATE orders SET payment_status = $2, updated_at = now(), order_status = CASE WHEN $2 = 'PAID' THEN 'PAID' ELSE order_status END WHERE id = $1", [orderId, status]);
      await client.query('COMMIT');
      return { payId, paid, total, status };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function closeOrder(orderId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        'SELECT payment_status, table_id FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      if (orderRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'not_found' };
      }
      if (orderRes.rows[0].payment_status !== 'PAID') {
        await client.query('ROLLBACK');
        return { error: 'payment_required' };
      }
      await client.query("UPDATE orders SET order_status = 'CLOSED', updated_at = now() WHERE id = $1", [orderId]);
      const tableStatus = await syncTableAvailability(client, orderRes.rows[0].table_id);
      await client.query('COMMIT');
      return { tableId: orderRes.rows[0].table_id || null, tableStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    getOrderById,
    findOrderIdByIdempotencyKey,
    createOrder,
    listOrders,
    cancelOrder,
    addOrderItem,
    updateOrderItem,
    deleteOrderItem,
    addPayment,
    closeOrder
  };
};
