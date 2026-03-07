const express = require('express');

module.exports = function createEmployeesRouter(deps) {
  const {
    db,
    randomUUID,
    bcrypt,
    authenticate,
    requirePermission,
    branchFilter,
    requireResourceBranch,
    requireBranchBody,
    ensureBranchAccess,
    getEmployeeBranchId,
    writeAuditLog,
    publishRealtime,
    validateBody,
    employeeCreateSchema,
    employeePatchSchema,
    userStatusSchema
  } = deps;

  const router = express.Router();

  router.get('/employees', authenticate, requirePermission('EMPLOYEE_VIEW'), branchFilter({ column: 'e.branch_id' }), async (req, res) => {
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position,
              u.username, u.is_active
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ${where}
       ORDER BY COALESCE(e.full_name, u.username) ASC`,
      params
    );
    return res.json(result.rows);
  });

  router.get('/employees/:id', authenticate, requirePermission('EMPLOYEE_VIEW'), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), async (req, res) => {
    const result = await db.query(
      'SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position, u.username, u.is_active FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    return res.json(result.rows[0]);
  });

  router.post('/employees', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(employeeCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    try {
      const { username, password, branch_id, full_name, phone, position } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        if (branch_id) {
          const branchRes = await client.query('SELECT 1 FROM branches WHERE id = $1', [branch_id]);
          if (branchRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'branch_not_found' });
          }
        }
        const existsRes = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
        if (existsRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'username_exists' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const userId = randomUUID();
        await client.query(
          'INSERT INTO users (id, username, password_hash, is_active) VALUES ($1, $2, $3, true)',
          [userId, username, password_hash]
        );
        const employeeId = randomUUID();
        await client.query(
          'INSERT INTO employees (id, user_id, branch_id, full_name, phone, position) VALUES ($1, $2, $3, $4, $5, $6)',
          [employeeId, userId, branch_id || null, full_name || null, phone || null, position || null]
        );
        await client.query('COMMIT');
        await writeAuditLog(req, 'EMPLOYEE_CREATE', 'employee', employeeId, { username, branch_id });
        publishRealtime('employee.created', { id: employeeId, user_id: userId, username, full_name, phone, position, branch_id: branch_id || null }, branch_id || null);
        return res.status(201).json({ id: employeeId, user_id: userId, username, full_name, phone, position, branch_id });
      } finally {
        client.release();
      }
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'unique_violation', detail: err.detail || err.message });
      if (err.code === '22P02') return res.status(400).json({ error: 'invalid_input', detail: err.detail || err.message });
      return res.status(500).json({ error: 'employee_create_failed', detail: err.message });
    }
  });

  router.patch('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(employeePatchSchema), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), async (req, res) => {
    try {
      const { full_name, phone, position, branch_id } = req.body || {};
      if (branch_id && !(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
      const result = await db.query(
        'UPDATE employees SET full_name = COALESCE($2, full_name), phone = COALESCE($3, phone), position = COALESCE($4, position), branch_id = COALESCE($5, branch_id) WHERE id = $1 RETURNING id, user_id, branch_id, full_name, phone, position',
        [req.params.id, full_name ?? null, phone ?? null, position ?? null, branch_id ?? null]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'EMPLOYEE_UPDATE', 'employee', req.params.id, req.body);
      publishRealtime('employee.updated', result.rows[0], result.rows[0].branch_id || null);
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: 'employee_update_failed', detail: err.message });
    }
  });

  router.delete('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), async (req, res) => {
    try {
      const emp = await db.query('SELECT user_id FROM employees WHERE id = $1', [req.params.id]);
      if (emp.rows.length === 0) return res.status(404).json({ error: 'not_found' });
      await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
      await writeAuditLog(req, 'EMPLOYEE_DELETE', 'employee', req.params.id, {});
      publishRealtime('employee.deleted', { id: req.params.id }, req.resourceBranchId || null);
      return res.json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: 'employee_delete_failed', detail: err.message });
    }
  });

  router.patch('/users/:id/status', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(userStatusSchema), async (req, res) => {
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active_required' });
    const result = await db.query('UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id, username, is_active', [req.params.id, is_active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'USER_STATUS_UPDATE', 'user', req.params.id, { is_active });
    publishRealtime('user.status.updated', { id: result.rows[0].id, username: result.rows[0].username, is_active }, null);
    return res.json(result.rows[0]);
  });

  return router;
};
