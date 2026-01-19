const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const db = require('./db');
const { signToken, authenticate, requirePermission } = require('./auth');

const app = express();
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

// Orders endpoint protected by RBAC
app.post('/orders', authenticate, requirePermission('ORDERS_CREATE'), (req, res) => {
  const id = randomUUID();
  res.status(201).json(Object.assign({ id }, req.body));
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('backend listening on', port));
