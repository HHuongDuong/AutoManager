const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('./db');
const { signToken, authenticate, requirePermission } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

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
  return res.json({ user_id: req.user.sub, roles: req.user.roles, permissions: req.user.permissions });
});

async function writeAuditLog(userId, action, objectType, objectId, payload) {
  try {
    await db.query(
      'INSERT INTO audit_logs (id, user_id, action, object_type, object_id, payload) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), userId, action, objectType, objectId, payload || null]
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

    await writeAuditLog(req.user.sub, 'ORDER_CREATE', 'order', orderId, { branch_id, order_type });
    await client.query('COMMIT');
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
  if (branch_id) { params.push(branch_id); filters.push(`branch_id = $${params.length}`); }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`, params);
  return res.json(result.rows);
});

app.get('/orders/:id', authenticate, requirePermission('ORDERS_VIEW'), async (req, res) => {
  const order = await getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.json(order);
});

app.post('/orders/:id/items', authenticate, requirePermission('ORDERS_UPDATE'), async (req, res) => {
  const { product_id, name, quantity, unit_price, toppings } = req.body || {};
  if (!product_id && !name) return res.status(400).json({ error: 'product_or_name_required' });
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
    await writeAuditLog(req.user.sub, 'ORDER_ITEM_ADD', 'order', req.params.id, { item_id: itemId });
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
    await writeAuditLog(req.user.sub, 'ORDER_ITEM_UPDATE', 'order', req.params.id, { item_id: req.params.itemId });
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
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM order_items WHERE id = $1 AND order_id = $2 RETURNING id', [req.params.itemId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const total = await updateOrderTotal(client, req.params.id);
    await writeAuditLog(req.user.sub, 'ORDER_ITEM_DELETE', 'order', req.params.id, { item_id: req.params.itemId });
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
    await writeAuditLog(req.user.sub, 'ORDER_PAY', 'order', req.params.id, { amount });
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
  const orderRes = await db.query('SELECT payment_status FROM orders WHERE id = $1', [req.params.id]);
  if (orderRes.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  if (orderRes.rows[0].payment_status !== 'PAID') return res.status(409).json({ error: 'payment_required' });
  await db.query('UPDATE orders SET order_status = \"CLOSED\", updated_at = now() WHERE id = $1', [req.params.id]);
  await writeAuditLog(req.user.sub, 'ORDER_CLOSE', 'order', req.params.id, {});
  return res.json({ closed: true });
});

// Employee management (CRUD)
app.get('/employees', authenticate, requirePermission('EMPLOYEE_VIEW'), async (req, res) => {
  const result = await db.query(
    'SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position, u.username, u.is_active FROM employees e LEFT JOIN users u ON u.id = e.user_id ORDER BY e.created_at DESC'
  );
  return res.json(result.rows);
});

app.get('/employees/:id', authenticate, requirePermission('EMPLOYEE_VIEW'), async (req, res) => {
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
    await writeAuditLog(req.user.sub, 'EMPLOYEE_CREATE', 'employee', employeeId, { username, branch_id });
    return res.status(201).json({ id: employeeId, user_id: userId, username, full_name, phone, position, branch_id });
  } catch (err) {
    return res.status(500).json({ error: 'employee_create_failed', detail: err.message });
  }
});

app.patch('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  try {
    const { full_name, phone, position, branch_id } = req.body || {};
    const result = await db.query(
      'UPDATE employees SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone), position = COALESCE($4, position), branch_id = COALESCE($5, branch_id) WHERE id = $1 RETURNING id, user_id, branch_id, full_name, phone, position',
      [req.params.id, full_name ?? null, phone ?? null, position ?? null, branch_id ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req.user.sub, 'EMPLOYEE_UPDATE', 'employee', req.params.id, req.body);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'employee_update_failed', detail: err.message });
  }
});

app.delete('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), async (req, res) => {
  try {
    const emp = await db.query('SELECT user_id FROM employees WHERE id = $1', [req.params.id]);
    if (emp.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    await writeAuditLog(req.user.sub, 'EMPLOYEE_DELETE', 'employee', req.params.id, {});
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
  await writeAuditLog(req.user.sub, 'USER_STATUS_UPDATE', 'user', req.params.id, { is_active });
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
  await writeAuditLog(req.user.sub, 'CATEGORY_CREATE', 'product_category', result.rows[0].id, { name });
  return res.status(201).json(result.rows[0]);
});

app.get('/products', authenticate, requirePermission('PRODUCT_VIEW'), async (req, res) => {
  const { branch_id, category_id, q } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) { params.push(branch_id); filters.push(`branch_id = $${params.length}`); }
  if (category_id) { params.push(category_id); filters.push(`category_id = $${params.length}`); }
  if (q) { params.push(`%${q}%`); filters.push(`name ILIKE $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT id, branch_id, category_id, sku, name, price, metadata FROM products ${where} ORDER BY name`, params);
  return res.json(result.rows);
});

app.post('/products', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { branch_id, category_id, sku, name, price, metadata } = req.body || {};
  if (!branch_id || !name || price == null) return res.status(400).json({ error: 'branch_id_name_price_required' });
  const result = await db.query(
    'INSERT INTO products (id, branch_id, category_id, sku, name, price, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, branch_id, category_id, sku, name, price, metadata',
    [randomUUID(), branch_id, category_id || null, sku || null, name, Number(price), metadata || null]
  );
  await writeAuditLog(req.user.sub, 'PRODUCT_CREATE', 'product', result.rows[0].id, { name, branch_id });
  return res.status(201).json(result.rows[0]);
});

app.patch('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { category_id, sku, name, price, metadata } = req.body || {};
  const result = await db.query(
    'UPDATE products SET category_id = COALESCE($2, category_id), sku = COALESCE($3, sku), name = COALESCE($4, name), price = COALESCE($5, price), metadata = COALESCE($6, metadata) WHERE id = $1 RETURNING id, branch_id, category_id, sku, name, price, metadata',
    [req.params.id, category_id ?? null, sku ?? null, name ?? null, price ?? null, metadata ?? null]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req.user.sub, 'PRODUCT_UPDATE', 'product', req.params.id, req.body);
  return res.json(result.rows[0]);
});

app.delete('/products/:id', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req.user.sub, 'PRODUCT_DELETE', 'product', req.params.id, {});
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
  await writeAuditLog(req.user.sub, 'TOPPING_GROUP_CREATE', 'topping_group', result.rows[0].id, { name });
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
  await writeAuditLog(req.user.sub, 'TOPPING_CREATE', 'topping', result.rows[0].id, { name, group_id });
  return res.status(201).json(result.rows[0]);
});

app.post('/products/:id/toppings', authenticate, requirePermission('PRODUCT_MANAGE'), async (req, res) => {
  const { topping_id, price_override } = req.body || {};
  if (!topping_id) return res.status(400).json({ error: 'topping_id_required' });
  await db.query('INSERT INTO product_toppings (product_id, topping_id, price_override) VALUES ($1, $2, $3)', [req.params.id, topping_id, price_override ?? null]);
  await writeAuditLog(req.user.sub, 'PRODUCT_TOPPING_ADD', 'product', req.params.id, { topping_id, price_override });
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
  await writeAuditLog(req.user.sub, 'INGREDIENT_CREATE', 'ingredient', result.rows[0].id, { name, unit });
  return res.status(201).json(result.rows[0]);
});

app.patch('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { name, unit } = req.body || {};
  const result = await db.query(
    'UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit) WHERE id = $1 RETURNING id, name, unit',
    [req.params.id, name ?? null, unit ?? null]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req.user.sub, 'INGREDIENT_UPDATE', 'ingredient', req.params.id, req.body);
  return res.json(result.rows[0]);
});

app.delete('/ingredients/:id', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const result = await db.query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
  await writeAuditLog(req.user.sub, 'INGREDIENT_DELETE', 'ingredient', req.params.id, {});
  return res.json({ deleted: true });
});

app.get('/inventory/transactions', authenticate, requirePermission('INVENTORY_VIEW'), async (req, res) => {
  const { branch_id, ingredient_id, from, to } = req.query || {};
  const params = [];
  const filters = [];
  if (branch_id) { params.push(branch_id); filters.push(`branch_id = $${params.length}`); }
  if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
  if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
  if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await db.query(`SELECT * FROM inventory_transactions ${where} ORDER BY created_at DESC`, params);
  return res.json(result.rows);
});

app.post('/inventory/transactions', authenticate, requirePermission('INVENTORY_MANAGE'), async (req, res) => {
  const { branch_id, ingredient_id, order_id, quantity, transaction_type, reason } = req.body || {};
  if (!branch_id || !ingredient_id || !transaction_type) return res.status(400).json({ error: 'branch_ingredient_type_required' });
  const qty = Number(quantity || 0);
  if (qty === 0) return res.status(400).json({ error: 'quantity_required' });
  const result = await db.query(
    'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, order_id, quantity, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, branch_id, ingredient_id, order_id, quantity, transaction_type, reason, created_at',
    [randomUUID(), branch_id, ingredient_id, order_id || null, qty, transaction_type, reason || null, req.user.sub]
  );
  await writeAuditLog(req.user.sub, 'INVENTORY_TX_CREATE', 'inventory_transaction', result.rows[0].id, { branch_id, ingredient_id, transaction_type, quantity: qty });
  return res.status(201).json(result.rows[0]);
});

// Reports & analytics
app.get('/reports/revenue', authenticate, requirePermission('REPORT_VIEW'), async (req, res) => {
  const { branch_id, from, to, group_by = 'day' } = req.query || {};
  const params = [];
  const filters = ['payment_status = \"PAID\"'];
  if (branch_id) { params.push(branch_id); filters.push(`branch_id = $${params.length}`); }
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
  if (branch_id) { params.push(branch_id); filters.push(`branch_id = $${params.length}`); }
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
  if (branch_id) { params.push(branch_id); filters.push(`e.branch_id = $${params.length}`); }
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
  await writeAuditLog(req.user.sub, 'AI_FORECAST', 'ai', null, { method, horizon: n, window: w });
  return res.json({ method, horizon: n, window: w, forecast });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('backend listening on', port));
