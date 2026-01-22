const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('./db');
const { signToken, authenticate, requirePermission } = require('./auth');
const { redisPing, redisGet, redisSet } = require('./infra/redis');
const { rabbitPing, publish } = require('./infra/rabbit');
const { issueInvoice } = require('./infra/einvoice');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

app.get('/health', async (req, res) => {
  const redis = await redisPing();
  const rabbit = await rabbitPing();
  res.json({ status: 'ok', redis, rabbit });
});

async function getUserRoles(userId) {
  const result = await db.query(
    'SELECT r.id, r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
    [userId]
  );
  return result.rows;
}

async function getUserPermissions(userId) {
  const result = await db.query(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return result.rows.map(r => r.code);
}

async function getAllowedBranchIds(userId) {
  const [empRes, accessRes] = await Promise.all([
    db.query('SELECT branch_id FROM employees WHERE user_id = $1', [userId]),
    db.query('SELECT branch_id FROM user_branch_access WHERE user_id = $1', [userId])
  ]);
  const branches = new Set();
  for (const row of empRes.rows) if (row.branch_id) branches.add(row.branch_id);
  for (const row of accessRes.rows) if (row.branch_id) branches.add(row.branch_id);
  return Array.from(branches);
}

async function ensureBranchAccess(req, branchId) {
  if (req.user?.permissions?.includes('RBAC_MANAGE')) return true;
  if (!branchId) return false;
  if (!req.allowedBranches) req.allowedBranches = await getAllowedBranchIds(req.user.sub);
  return req.allowedBranches.includes(branchId);
}

async function getOrderBranchId(orderId) {
  const result = await db.query('SELECT branch_id FROM orders WHERE id = $1', [orderId]);
  return result.rows[0]?.branch_id || null;
}

async function getTableBranchId(tableId) {
  const result = await db.query('SELECT branch_id FROM tables WHERE id = $1', [tableId]);
  return result.rows[0]?.branch_id || null;
}

async function getEmployeeBranchId(employeeId) {
  const result = await db.query('SELECT branch_id FROM employees WHERE id = $1', [employeeId]);
  return result.rows[0]?.branch_id || null;
}

app.post('/auth/register', async (req, res) => {
  try {
    const { username, password, role_ids = [] } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
    const password_hash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      'INSERT INTO users (id, username, password_hash, is_active) VALUES ($1, $2, $3, true) RETURNING id, username',
      [randomUUID(), username, password_hash]
    );
    const user = userRes.rows[0];
    if (Array.isArray(role_ids) && role_ids.length > 0) {
      const values = role_ids.map((_, i) => `($1, $${i + 2})`).join(',');
      await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values}`, [user.id, ...role_ids]);
    }
    return res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    return res.status(500).json({ error: 'register_failed', detail: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
    const userRes = await db.query('SELECT id, password_hash, is_active FROM users WHERE username = $1', [username]);
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'user_inactive' });
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);
    const token = signToken({ sub: user.id, roles, permissions });
    return res.json({ access_token: token, expires_in: 3600 });
  } catch (err) {
    return res.status(500).json({ error: 'login_failed', detail: err.message });
  }
});

app.get('/me', authenticate, async (req, res) => {
  const empRes = await db.query('SELECT id, branch_id, full_name FROM employees WHERE user_id = $1', [req.user.sub]);
  const employee = empRes.rows[0] || null;
  const branches = await getAllowedBranchIds(req.user.sub);
  return res.json({ user_id: req.user.sub, employee, branches, roles: req.user.roles, permissions: req.user.permissions });
});

async function writeAuditLog(userOrReq, action, objectType, objectId, payload) {
  try {
    const isReq = userOrReq && typeof userOrReq === 'object' && 'method' in userOrReq;
    const req = isReq ? userOrReq : null;
    const userId = isReq ? userOrReq.user?.sub : userOrReq;
    const branchId = payload?.branch_id || req?.body?.branch_id || req?.query?.branch_id || null;
    await db.query(
      `INSERT INTO audit_logs
       (id, user_id, branch_id, action, object_type, object_id, payload, request_id, method, path, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        randomUUID(),
        userId || null,
        branchId,
        action,
        objectType,
        objectId,
        payload || null,
        req?.requestId || null,
        req?.method || null,
        req?.originalUrl || null,
        req?.ip || null,
        req?.headers?.['user-agent'] || null
      ]
    );
  } catch (err) {
    // avoid breaking main flow on audit failure
    console.error('audit_log_failed', err.message);
  }
}

// RBAC management endpoints
app.get('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const result = await db.query('SELECT id, name FROM roles ORDER BY name');
  return res.json(result.rows);
});

app.post('/rbac/roles', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = await db.query('INSERT INTO roles (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
  return res.status(201).json(result.rows[0]);
});

app.get('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const result = await db.query('SELECT id, code, description FROM permissions ORDER BY code');
  return res.json(result.rows);
});

app.post('/rbac/permissions', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const { code, description } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code_required' });
  const result = await db.query(
    'INSERT INTO permissions (id, code, description) VALUES ($1, $2, $3) RETURNING id, code, description',
    [randomUUID(), code, description || null]
  );
  return res.status(201).json(result.rows[0]);
});

app.post('/rbac/roles/:roleId/permissions', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const { roleId } = req.params;
  const { permission_id } = req.body || {};
  if (!permission_id) return res.status(400).json({ error: 'permission_id_required' });
  await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, permission_id]);
  return res.status(201).json({ role_id: roleId, permission_id });
});

app.post('/rbac/users/:userId/roles', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const { userId } = req.params;
  const { role_id } = req.body || {};
  if (!role_id) return res.status(400).json({ error: 'role_id_required' });
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, role_id]);
  return res.status(201).json({ user_id: userId, role_id });
});

app.post('/rbac/users/:userId/branches', authenticate, requirePermission('RBAC_MANAGE'), async (req, res) => {
  const { userId } = req.params;
  const { branch_id } = req.body || {};
  if (!branch_id) return res.status(400).json({ error: 'branch_id_required' });
  await db.query('INSERT INTO user_branch_access (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, branch_id]);
  return res.status(201).json({ user_id: userId, branch_id });
});

app.get('/branches/:branchId/e-invoice', authenticate, requirePermission('EINVOICE_MANAGE'), async (req, res) => {
  const { branchId } = req.params;
  if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
  const settings = await getEInvoiceSettings(branchId);
  return res.json(settings);
});

app.put('/branches/:branchId/e-invoice', authenticate, requirePermission('EINVOICE_MANAGE'), async (req, res) => {
  const { branchId } = req.params;
  const { enabled = false, provider = null, config = null } = req.body || {};
  if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
  const settings = await upsertEInvoiceSettings(branchId, Boolean(enabled), provider, config);
  await writeAuditLog(req, 'EINVOICE_SETTINGS_UPDATE', 'e_invoice_settings', branchId, { branch_id: branchId, enabled, provider });
  return res.json(settings);
});

app.post('/orders/:id/e-invoice', authenticate, requirePermission('EINVOICE_MANAGE'), async (req, res) => {
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const order = await getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const result = await issueEInvoiceForOrder(req, order);
  return res.json(result);
});

function computeTotal(items) {
  return items.reduce((sum, i) => sum + (Number(i.unit_price) * Number(i.quantity)), 0);
}

async function getOrderById(orderId) {
  const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderRes.rows.length === 0) return null;
  const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [orderId]);
  const paymentsRes = await db.query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at', [orderId]);
  return Object.assign({}, orderRes.rows[0], { items: itemsRes.rows, payments: paymentsRes.rows });
}

async function getEInvoiceSettings(branchId) {
  const result = await db.query(
    'SELECT branch_id, enabled, provider, config FROM e_invoice_settings WHERE branch_id = $1',
    [branchId]
  );
  if (result.rows.length === 0) return { branch_id: branchId, enabled: false, provider: null, config: null };
  return result.rows[0];
}

async function upsertEInvoiceSettings(branchId, enabled, provider, config) {
  const result = await db.query(
    `INSERT INTO e_invoice_settings (branch_id, enabled, provider, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (branch_id) DO UPDATE SET enabled = EXCLUDED.enabled, provider = EXCLUDED.provider, config = EXCLUDED.config, updated_at = now()
     RETURNING branch_id, enabled, provider, config`,
    [branchId, enabled, provider || null, config || null]
  );
  return result.rows[0];
}

async function issueEInvoiceForOrder(req, order) {
  if (!order?.branch_id) return { skipped: true, reason: 'missing_branch' };
  const settings = await getEInvoiceSettings(order.branch_id);
  if (!settings.enabled || !settings.provider) return { skipped: true, reason: 'disabled' };
  const payload = {
    order_id: order.id,
    branch_id: order.branch_id,
    order_type: order.order_type,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    payments: order.payments || [],
    items: order.items || [],
    created_at: order.created_at
  };

  try {
    const result = await issueInvoice(settings.provider, payload, settings.config || {});
    const invoiceId = randomUUID();
    await db.query(
      `INSERT INTO e_invoices (id, branch_id, order_id, provider, status, external_id, payload, response, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [invoiceId, order.branch_id, order.id, settings.provider, result.status || 'ISSUED', result.external_id || null, payload, result.raw || null]
    );
    await writeAuditLog(req, 'EINVOICE_ISSUE', 'e_invoice', invoiceId, { branch_id: order.branch_id, order_id: order.id });
    return { issued: true, id: invoiceId, external_id: result.external_id || null };
  } catch (err) {
    await writeAuditLog(req, 'EINVOICE_ISSUE_FAILED', 'e_invoice', null, { branch_id: order.branch_id, order_id: order.id, error: err.message });
    return { issued: false, error: err.message };
  }
}

async function updateOrderTotal(client, orderId) {
  const result = await client.query('SELECT COALESCE(SUM(subtotal), 0) AS total FROM order_items WHERE order_id = $1', [orderId]);
  const total = Number(result.rows[0].total || 0);
  await client.query('UPDATE orders SET total_amount = $2, updated_at = now() WHERE id = $1', [orderId, total]);
  return total;
}

// Orders endpoints protected by RBAC
app.post('/orders', authenticate, requirePermission('ORDERS_CREATE'), async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  const { client_id, branch_id, created_by, order_type, table_id, items = [], payments = [], metadata } = req.body || {};
  if (!branch_id || !order_type) return res.status(400).json({ error: 'branch_id_and_order_type_required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items_required' });
  if (order_type === 'DINE_IN' && !table_id) return res.status(400).json({ error: 'table_id_required_for_dine_in' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });

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
    await client.query(
      'INSERT INTO orders (id, branch_id, client_id, created_by, order_type, table_id, total_amount, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [orderId, branch_id, client_id || null, created_by || null, order_type, table_id || null, total, metadata || null]
    );
    if (order_type === 'DINE_IN' && table_id) {
      await client.query('UPDATE tables SET status = \"OCCUPIED\" WHERE id = $1', [table_id]);
    }

    for (const item of items) {
      const itemId = randomUUID();
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || 0);
      const subtotal = quantity * unitPrice;
      await client.query(
        'INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal, toppings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [itemId, orderId, item.product_id || null, item.name || null, quantity, unitPrice, subtotal, item.toppings || null]
      );
    }

    for (const pay of payments) {
      const payId = randomUUID();
      await client.query(
        'INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata) VALUES ($1, $2, $3, $4, $5)',
        [payId, orderId, Number(pay.amount || 0), pay.payment_method || 'CASH', pay.provider_metadata || null]
      );
    }

    if (idempotencyKey) {
      await client.query(
        'INSERT INTO idempotency_keys (id, key, user_id, order_id, expires_at) VALUES ($1, $2, $3, $4, now() + interval \"1 day\")',
        [randomUUID(), idempotencyKey, req.user.sub, orderId]
      );
    }

    await writeAuditLog(req, 'ORDER_CREATE', 'order', orderId, { branch_id, order_type });
    await client.query('COMMIT');
    try {
      await publish('orders.created', { order_id: orderId, branch_id, order_type, created_at: new Date().toISOString() });
    } catch (err) {
      // ignore queue errors for now
    }
    const order = await getOrderById(orderId);
    return res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'order_create_failed', detail: err.message });
  } finally {
    client.release();
  }
});

app.get('/orders', authenticate, requirePermission('ORDERS_VIEW'), async (req, res) => {
  const { branch_id, from, to } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else {
    const allowed = req.user?.permissions?.includes('RBAC_MANAGE') ? [] : await getAllowedBranchIds(req.user.sub);
    if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
      if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
      params.push(allowed);
      filters.push(`branch_id = ANY($${params.length})`);
    }
  }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params);
  return res.json(result.rows);
});

app.get('/orders/:id', authenticate, requirePermission('ORDERS_VIEW'), async (req, res) => {
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const order = await getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.json(order);
});

app.post('/orders/:id/items', authenticate, requirePermission('ORDERS_UPDATE'), async (req, res) => {
  const { product_id, name, quantity, unit_price, toppings } = req.body || {};
  if (!product_id && !name) return res.status(400).json({ error: 'product_or_name_required' });
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const itemId = randomUUID();
    const qty = Number(quantity || 1);
    const price = Number(unit_price || 0);
    const subtotal = qty * price;
    await client.query(
      'INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal, toppings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [itemId, req.params.id, product_id || null, name || null, qty, price, subtotal, toppings || null]
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

app.patch('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), async (req, res) => {
  const { quantity, unit_price } = req.body || {};
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
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

app.delete('/orders/:id/items/:itemId', authenticate, requirePermission('ORDERS_UPDATE'), async (req, res) => {
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
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

app.post('/orders/:id/payments', authenticate, requirePermission('ORDERS_PAY'), async (req, res) => {
  const { amount, payment_method, provider_metadata } = req.body || {};
  if (!amount) return res.status(400).json({ error: 'amount_required' });
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
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
    await client.query('UPDATE orders SET payment_status = $2, updated_at = now(), order_status = CASE WHEN $2 = \"PAID\" THEN \"PAID\" ELSE order_status END WHERE id = $1', [req.params.id, status]);
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

app.post('/orders/:id/close', authenticate, requirePermission('ORDERS_UPDATE'), async (req, res) => {
  const orderBranch = await getOrderBranchId(req.params.id);
  if (!orderBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, orderBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const orderRes = await db.query('SELECT payment_status, table_id FROM orders WHERE id = $1', [req.params.id]);
  if (orderRes.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (orderRes.rows[0].payment_status !== 'PAID') return res.status(409).json({ error: 'payment_required' });
  await db.query('UPDATE orders SET order_status = \"CLOSED\", updated_at = now() WHERE id = $1', [req.params.id]);
  if (orderRes.rows[0].table_id) {
    await db.query('UPDATE tables SET status = \"AVAILABLE\" WHERE id = $1', [orderRes.rows[0].table_id]);
  }
  await writeAuditLog(req, 'ORDER_CLOSE', 'order', req.params.id, {});
  const order = await getOrderById(req.params.id);
  await issueEInvoiceForOrder(req, order);
  return res.json({ closed: true });
});

// Tables management
app.get('/tables', authenticate, requirePermission('TABLE_VIEW'), async (req, res) => {
  const { branch_id } = req.query || {};
  const params = [];
  let where = '';
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    where = `WHERE branch_id = $1`;
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    where = `WHERE branch_id = ANY($1)`;
  }
  const result = await db.query(`SELECT id, branch_id, name, status FROM tables ${where} ORDER BY name`, params);
  return res.json(result.rows);
});

app.post('/tables', authenticate, requirePermission('TABLE_MANAGE'), async (req, res) => {
  const { branch_id, name, status } = req.body || {};
  if (!branch_id || !name) return res.status(400).json({ error: 'branch_id_name_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'INSERT INTO tables (id, branch_id, name, status) VALUES ($1, $2, $3, $4) RETURNING id, branch_id, name, status',
    [randomUUID(), branch_id, name, status || 'AVAILABLE']
  );
  await writeAuditLog(req, 'TABLE_CREATE', 'table', result.rows[0].id, { name, branch_id });
  return res.status(201).json(result.rows[0]);
});

app.patch('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), async (req, res) => {
  const { name, status } = req.body || {};
  const tableBranch = await getTableBranchId(req.params.id);
  if (!tableBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, tableBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'UPDATE tables SET name = COALESCE($2, name), status = COALESCE($3, status) WHERE id = $1 RETURNING id, branch_id, name, status',
    [req.params.id, name ?? null, status ?? null]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'TABLE_UPDATE', 'table', req.params.id, req.body);
  return res.json(result.rows[0]);
});

app.delete('/tables/:id', authenticate, requirePermission('TABLE_MANAGE'), async (req, res) => {
  const tableBranch = await getTableBranchId(req.params.id);
  if (!tableBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, tableBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query('DELETE FROM tables WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'TABLE_DELETE', 'table', req.params.id, {});
  return res.json({ deleted: true });
});

app.patch('/tables/:id/status', authenticate, requirePermission('TABLE_MANAGE'), async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status_required' });
  const tableBranch = await getTableBranchId(req.params.id);
  if (!tableBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, tableBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query('UPDATE tables SET status = $2 WHERE id = $1 RETURNING id, branch_id, name, status', [req.params.id, status]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'TABLE_STATUS_UPDATE', 'table', req.params.id, { status });
  return res.json(result.rows[0]);
});

// Audit log viewer
app.get('/audit-logs', authenticate, requirePermission('AUDIT_VIEW'), async (req, res) => {
  const { user_id, action, from, to, branch_id, limit = 100 } = req.query || {};
  const params = [];
  const filters = [];
  if (user_id) { params.push(user_id); filters.push(`user_id = $${params.length}`); }
  if (action) { params.push(action); filters.push(`action = $${params.length}`); }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`(branch_id = ANY($${params.length}) OR branch_id IS NULL)`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  params.push(Number(limit));
  const result = await db.query(
    `SELECT id, user_id, branch_id, action, object_type, object_id, payload, request_id, method, path, ip, user_agent, created_at
     FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return res.json(result.rows);
});

// Employee management (CRUD)
app.get('/employees', authenticate, requirePermission('EMPLOYEE_VIEW'), async (req, res) => {
  const params = [];
  let where = '';
  if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    where = 'WHERE e.branch_id = ANY($1)';
  }
  const result = await db.query(
    `SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position, u.username, u.is_active
     FROM employees e LEFT JOIN users u ON u.id = e.user_id ${where} ORDER BY e.created_at DESC`,
    params
  );
  return res.json(result.rows);
});

app.get('/employees/:id', authenticate, requirePermission('EMPLOYEE_VIEW'), async (req, res) => {
  const empBranch = await getEmployeeBranchId(req.params.id);
  if (!empBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, empBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position, u.username, u.is_active FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1',
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  return res.json(result.rows[0]);
});

app.post('/employees', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  try {
    const { username, password, branch_id, full_name, phone, position } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
    if (branch_id && !(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    const password_hash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    await db.query(
      'INSERT INTO users (id, username, password_hash, is_active) VALUES ($1, $2, $3, true)',
      [userId, username, password_hash]
    );
    const employeeId = randomUUID();
    await db.query(
      'INSERT INTO employees (id, user_id, branch_id, full_name, phone, position) VALUES ($1, $2, $3, $4, $5, $6)',
      [employeeId, userId, branch_id || null, full_name || null, phone || null, position || null]
    );
    await writeAuditLog(req, 'EMPLOYEE_CREATE', 'employee', employeeId, { username, branch_id });
    return res.status(201).json({ id: employeeId, user_id: userId, username, full_name, phone, position, branch_id });
  } catch (err) {
    return res.status(500).json({ error: 'employee_create_failed', detail: err.message });
  }
});

app.patch('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  try {
    const { full_name, phone, position, branch_id } = req.body || {};
    const empBranch = await getEmployeeBranchId(req.params.id);
    if (!empBranch) return res.status(404).json({ error: 'not_found' });
    if (!(await ensureBranchAccess(req, empBranch))) return res.status(403).json({ error: 'branch_forbidden' });
    if (branch_id && !(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    const result = await db.query(
      'UPDATE employees SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone), position = COALESCE($4, position), branch_id = COALESCE($5, branch_id) WHERE id = $1 RETURNING id, user_id, branch_id, full_name, phone, position',
      [req.params.id, full_name ?? null, phone ?? null, position ?? null, branch_id ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'EMPLOYEE_UPDATE', 'employee', req.params.id, req.body);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'employee_update_failed', detail: err.message });
  }
});

app.delete('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  try {
    const empBranch = await getEmployeeBranchId(req.params.id);
    if (!empBranch) return res.status(404).json({ error: 'not_found' });
    if (!(await ensureBranchAccess(req, empBranch))) return res.status(403).json({ error: 'branch_forbidden' });
    const emp = await db.query('SELECT user_id FROM employees WHERE id = $1', [req.params.id]);
    if (emp.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    await writeAuditLog(req, 'EMPLOYEE_DELETE', 'employee', req.params.id, {});
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'employee_delete_failed', detail: err.message });
  }
});

app.patch('/users/:id/status', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  const { is_active } = req.body || {};
  if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active_required' });
  const result = await db.query('UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id, username, is_active', [req.params.id, is_active]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'USER_STATUS_UPDATE', 'user', req.params.id, { is_active });
  return res.json(result.rows[0]);
});

// Product & Menu management
app.get('/product-categories', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
  const result = await db.query('SELECT id, name FROM product_categories ORDER BY name');
  return res.json(result.rows);
});

app.post('/product-categories', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = await db.query('INSERT INTO product_categories (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
  await writeAuditLog(req, 'CATEGORY_CREATE', 'product_category', result.rows[0].id, { name });
  return res.status(201).json(result.rows[0]);
});

app.get('/products', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
  const { branch_id, category_id, q } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`branch_id = ANY($${params.length})`);
  }
  if (category_id) { params.push(category_id); filters.push(`category_id = $${params.length}`); }
  if (q) { params.push(`%${q}%`); filters.push(`name ILIKE $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const cacheKey = `products:${branch_id || 'all'}:${category_id || 'all'}:${q || ''}`;
  const cached = await redisGet(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const result = await db.query(`SELECT id, branch_id, category_id, sku, name, price, metadata FROM products ${where} ORDER BY name`, params);
  await redisSet(cacheKey, JSON.stringify(result.rows), 60);
  return res.json(result.rows);
});

app.post('/products', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { branch_id, category_id, sku, name, price, metadata } = req.body || {};
  if (!branch_id || !name || price == null) return res.status(400).json({ error: 'branch_id_name_price_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'INSERT INTO products (id, branch_id, category_id, sku, name, price, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, branch_id, category_id, sku, name, price, metadata',
    [randomUUID(), branch_id, category_id || null, sku || null, name, Number(price), metadata || null]
  );
  await writeAuditLog(req, 'PRODUCT_CREATE', 'product', result.rows[0].id, { name, branch_id });
  return res.status(201).json(result.rows[0]);
});

app.patch('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { category_id, sku, name, price, metadata } = req.body || {};
  const prodBranchRes = await db.query('SELECT branch_id FROM products WHERE id = $1', [req.params.id]);
  const prodBranch = prodBranchRes.rows[0]?.branch_id || null;
  if (!prodBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, prodBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'UPDATE products SET category_id = COALESCE($2, category_id), sku = COALESCE($3, sku), name = COALESCE($4, name), price = COALESCE($5, price), metadata = COALESCE($6, metadata) WHERE id = $1 RETURNING id, branch_id, category_id, sku, name, price, metadata',
    [req.params.id, category_id ?? null, sku ?? null, name ?? null, price ?? null, metadata ?? null]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'PRODUCT_UPDATE', 'product', req.params.id, req.body);
  return res.json(result.rows[0]);
});

app.delete('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const prodBranchRes = await db.query('SELECT branch_id FROM products WHERE id = $1', [req.params.id]);
  const prodBranch = prodBranchRes.rows[0]?.branch_id || null;
  if (!prodBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, prodBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'PRODUCT_DELETE', 'product', req.params.id, {});
  return res.json({ deleted: true });
});

app.get('/topping-groups', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
  const result = await db.query('SELECT id, name FROM topping_groups ORDER BY name');
  return res.json(result.rows);
});

app.post('/topping-groups', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = await db.query('INSERT INTO topping_groups (id, name) VALUES ($1, $2) RETURNING id, name', [randomUUID(), name]);
  await writeAuditLog(req, 'TOPPING_GROUP_CREATE', 'topping_group', result.rows[0].id, { name });
  return res.status(201).json(result.rows[0]);
});

app.get('/toppings', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
  const { group_id } = req.query || {};
  const params = [];
  const filters = [];
  if (group_id) { params.push(group_id); filters.push(`group_id = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT id, group_id, name, price FROM toppings ${where} ORDER BY name`, params);
  return res.json(result.rows);
});

app.post('/toppings', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { group_id, name, price } = req.body || {};
  if (!group_id || !name) return res.status(400).json({ error: 'group_id_name_required' });
  const result = await db.query('INSERT INTO toppings (id, group_id, name, price) VALUES ($1, $2, $3, $4) RETURNING id, group_id, name, price', [randomUUID(), group_id, name, Number(price || 0)]);
  await writeAuditLog(req, 'TOPPING_CREATE', 'topping', result.rows[0].id, { name, group_id });
  return res.status(201).json(result.rows[0]);
});

app.post('/products/:id/toppings', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { topping_id, price_override } = req.body || {};
  if (!topping_id) return res.status(400).json({ error: 'topping_id_required' });
  const prodBranchRes = await db.query('SELECT branch_id FROM products WHERE id = $1', [req.params.id]);
  const prodBranch = prodBranchRes.rows[0]?.branch_id || null;
  if (!prodBranch) return res.status(404).json({ error: 'not_found' });
  if (!(await ensureBranchAccess(req, prodBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  await db.query('INSERT INTO product_toppings (product_id, topping_id, price_override) VALUES ($1, $2, $3)', [req.params.id, topping_id, price_override ?? null]);
  await writeAuditLog(req, 'PRODUCT_TOPPING_ADD', 'product', req.params.id, { topping_id, price_override });
  return res.status(201).json({ product_id: req.params.id, topping_id, price_override });
});

// Inventory / Ingredients module
app.get('/ingredients', authenticate, requirePermission('INVENTORY_VIEW'), async (req, res) => {
  const result = await db.query('SELECT id, name, unit FROM ingredients ORDER BY name');
  return res.json(result.rows);
});

app.post('/ingredients', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { name, unit } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = await db.query('INSERT INTO ingredients (id, name, unit) VALUES ($1, $2, $3) RETURNING id, name, unit', [randomUUID(), name, unit || null]);
  await writeAuditLog(req, 'INGREDIENT_CREATE', 'ingredient', result.rows[0].id, { name, unit });
  return res.status(201).json(result.rows[0]);
});

app.patch('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { name, unit } = req.body || {};
  const result = await db.query(
    'UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit) WHERE id = $1 RETURNING id, name, unit',
    [req.params.id, name ?? null, unit ?? null]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'INGREDIENT_UPDATE', 'ingredient', req.params.id, req.body);
  return res.json(result.rows[0]);
});

app.delete('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const result = await db.query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req, 'INGREDIENT_DELETE', 'ingredient', req.params.id, {});
  return res.json({ deleted: true });
});

app.get('/inventory/transactions', authenticate, requirePermission('INVENTORY_VIEW'), async (req, res) => {
  const { branch_id, ingredient_id, from, to } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`branch_id = ANY($${params.length})`);
  }
  if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM inventory_transactions ${where} ORDER BY created_at DESC`, params);
  return res.json(result.rows);
});

app.post('/inventory/transactions', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { branch_id, ingredient_id, order_id, quantity, transaction_type, reason, unit_cost } = req.body || {};
  if (!branch_id || !ingredient_id || !transaction_type) return res.status(400).json({ error: 'branch_ingredient_type_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const qty = Number(quantity || 0);
  if (qty === 0) return res.status(400).json({ error: 'quantity_required' });
  const result = await db.query(
    'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_at',
    [randomUUID(), branch_id, ingredient_id, order_id || null, qty, unit_cost || null, transaction_type, reason || null, req.user.sub]
  );
  await writeAuditLog(req, 'INVENTORY_TX_CREATE', 'inventory_transaction', result.rows[0].id, { branch_id, ingredient_id, transaction_type, quantity: qty });
  return res.status(201).json(result.rows[0]);
});

// Inventory voucher endpoints
app.post('/inventory/receipts', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { branch_id, items = [], reason } = req.body || {};
  if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (!item.ingredient_id || qty === 0) continue;
      const row = await client.query(
        'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
        [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'IN', reason || null, req.user.sub]
      );
      results.push(row.rows[0]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ created: results.length, items: results });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'receipt_create_failed', detail: err.message });
  } finally {
    client.release();
  }
});

app.post('/inventory/issues', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { branch_id, items = [], reason } = req.body || {};
  if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (!item.ingredient_id || qty === 0) continue;
      const row = await client.query(
        'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
        [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'OUT', reason || null, req.user.sub]
      );
      results.push(row.rows[0]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ created: results.length, items: results });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'issue_create_failed', detail: err.message });
  } finally {
    client.release();
  }
});

app.post('/inventory/adjustments', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { branch_id, items = [], reason } = req.body || {};
  if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const item of items) {
      const qty = Number(item.quantity || 0);
      if (!item.ingredient_id || qty === 0) continue;
      const row = await client.query(
        'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
        [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, 'ADJUST', reason || null, req.user.sub]
      );
      results.push(row.rows[0]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ created: results.length, items: results });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'adjustment_create_failed', detail: err.message });
  } finally {
    client.release();
  }
});

// Reports & analytics
app.get('/reports/revenue', authenticate, requirePermission('REPORT_VIEW'), async (req, res) => {
  const { branch_id, from, to, group_by = 'day' } = req.query || {};
  const params = [];
  const filters = ['payment_status = \"PAID\"'];
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`branch_id = ANY($${params.length})`);
  }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const bucket = group_by === 'month' ? 'month' : 'day';
  const result = await db.query(
    `SELECT date_trunc('${bucket}', created_at) AS bucket, COUNT(*) AS orders, SUM(total_amount) AS revenue
     FROM orders
     WHERE ${filters.join(' AND ')}
     GROUP BY bucket
     ORDER BY bucket`,
    params
  );
  return res.json(result.rows);
});

app.get('/reports/inventory', authenticate, requirePermission('REPORT_VIEW'), async (req, res) => {
  const { branch_id, ingredient_id, from, to } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`branch_id = ANY($${params.length})`);
  }
  if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ingredient_id,
            SUM(CASE WHEN transaction_type = 'IN' THEN quantity ELSE 0 END) AS total_in,
            SUM(CASE WHEN transaction_type = 'OUT' THEN quantity ELSE 0 END) AS total_out,
            SUM(CASE WHEN transaction_type = 'ADJUST' THEN quantity ELSE 0 END) AS total_adjust
     FROM inventory_transactions
     ${where}
     GROUP BY ingredient_id`,
    params
  );
  return res.json(result.rows);
});

app.get('/reports/attendance', authenticate, requirePermission('REPORT_VIEW'), async (req, res) => {
  const { branch_id, from, to } = req.query || {};
  const params = [];
  const filters = [];
  if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
  if (branch_id) {
    if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(branch_id);
    filters.push(`e.branch_id = $${params.length}`);
  } else if (!req.user?.permissions?.includes('RBAC_MANAGE')) {
    const allowed = await getAllowedBranchIds(req.user.sub);
    if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
    params.push(allowed);
    filters.push(`e.branch_id = ANY($${params.length})`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT e.id AS employee_id, e.full_name, SUM(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600) AS total_hours
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     ${where}
     GROUP BY e.id, e.full_name
     ORDER BY total_hours DESC`,
    params
  );
  return res.json(result.rows);
});

// Shifts & Attendance
app.get('/shifts', authenticate, requirePermission('ATTENDANCE_VIEW'), async (req, res) => {
  const result = await db.query('SELECT id, name, start_time, end_time FROM shifts ORDER BY start_time');
  return res.json(result.rows);
});

app.post('/shifts', authenticate, requirePermission('ATTENDANCE_MANAGE'), async (req, res) => {
  const { name, start_time, end_time } = req.body || {};
  if (!name || !start_time || !end_time) return res.status(400).json({ error: 'name_start_end_required' });
  const result = await db.query(
    'INSERT INTO shifts (id, name, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING id, name, start_time, end_time',
    [randomUUID(), name, start_time, end_time]
  );
  await writeAuditLog(req, 'SHIFT_CREATE', 'shift', result.rows[0].id, { name });
  return res.status(201).json(result.rows[0]);
});

app.post('/attendance/checkin', authenticate, requirePermission('ATTENDANCE_MANAGE'), async (req, res) => {
  const { employee_id, shift_id } = req.body || {};
  if (!employee_id || !shift_id) return res.status(400).json({ error: 'employee_shift_required' });
  const empBranch = await getEmployeeBranchId(employee_id);
  if (!empBranch) return res.status(404).json({ error: 'employee_not_found' });
  if (!(await ensureBranchAccess(req, empBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const openRes = await db.query(
    'SELECT id FROM attendance WHERE employee_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
    [employee_id]
  );
  if (openRes.rows.length > 0) return res.status(409).json({ error: 'already_checked_in' });
  const result = await db.query(
    'INSERT INTO attendance (id, employee_id, shift_id, check_in) VALUES ($1, $2, $3, now()) RETURNING id, employee_id, shift_id, check_in',
    [randomUUID(), employee_id, shift_id]
  );
  await writeAuditLog(req, 'ATTENDANCE_CHECKIN', 'attendance', result.rows[0].id, { employee_id, shift_id });
  return res.status(201).json(result.rows[0]);
});

app.post('/attendance/checkout', authenticate, requirePermission('ATTENDANCE_MANAGE'), async (req, res) => {
  const { employee_id } = req.body || {};
  if (!employee_id) return res.status(400).json({ error: 'employee_required' });
  const empBranch = await getEmployeeBranchId(employee_id);
  if (!empBranch) return res.status(404).json({ error: 'employee_not_found' });
  if (!(await ensureBranchAccess(req, empBranch))) return res.status(403).json({ error: 'branch_forbidden' });
  const result = await db.query(
    'UPDATE attendance SET check_out = now() WHERE employee_id = $1 AND check_out IS NULL RETURNING id, employee_id, shift_id, check_in, check_out',
    [employee_id]
  );
  if (result.rows.length === 0) return res.status(409).json({ error: 'not_checked_in' });
  await writeAuditLog(req, 'ATTENDANCE_CHECKOUT', 'attendance', result.rows[0].id, { employee_id });
  return res.json(result.rows[0]);
});

// AI (optional) - simple demand forecast
app.post('/ai/forecast', authenticate, requirePermission('AI_USE'), async (req, res) => {
  const { series = [], horizon = 7, method = 'moving_average', window = 7 } = req.body || {};
  if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'series_required' });
  const w = Math.max(1, Number(window || 7));
  const n = Math.max(1, Number(horizon || 7));
  let forecast = [];
  if (method === 'moving_average') {
    for (let i = 0; i < n; i++) {
      const slice = series.slice(Math.max(0, series.length - w));
      const avg = slice.reduce((s, v) => s + Number(v || 0), 0) / slice.length;
      forecast.push(Number(avg.toFixed(2)));
      series.push(avg);
    }
  } else {
    return res.status(400).json({ error: 'unsupported_method' });
  }
  await writeAuditLog(req, 'AI_FORECAST', 'ai', null, { method, horizon: n, window: w });
  return res.json({ method, horizon: n, window: w, forecast });
});

// AI suggest reorder quantities (simple heuristic)
app.post('/ai/suggest-reorder', authenticate, requirePermission('AI_USE'), async (req, res) => {
  const { branch_id, items = [] } = req.body || {};
  if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
  if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });

  const suggestions = items.map(i => {
    const avg = (Array.isArray(i.series) && i.series.length)
      ? i.series.reduce((s, v) => s + Number(v || 0), 0) / i.series.length
      : 0;
    const target = avg * 7; // next 7 days
    const on_hand = Number(i.on_hand || 0);
    const reorder_qty = Math.max(0, Math.round(target - on_hand));
    return {
      ingredient_id: i.ingredient_id,
      on_hand,
      avg_daily: Number(avg.toFixed(2)),
      horizon_days: 7,
      target_stock: Number(target.toFixed(2)),
      reorder_qty
    };
  });

  await writeAuditLog(req, 'AI_REORDER_SUGGEST', 'ai', null, { branch_id, count: suggestions.length });
  return res.json({ branch_id, suggestions });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('backend listening on', port));
