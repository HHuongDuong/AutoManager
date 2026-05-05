module.exports = function createEmployeesService(deps) {
  const { db, randomUUID, bcrypt } = deps;

  async function listEmployees(branchFilter) {
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
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
    return result.rows;
  }

  async function getEmployeeById(id) {
    const result = await db.query(
      'SELECT e.id, e.user_id, e.branch_id, e.full_name, e.phone, e.position, u.username, u.is_active FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async function createEmployee(payload) {
    const { username, password, branch_id, full_name, phone, position } = payload;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      if (branch_id) {
        const branchRes = await client.query('SELECT 1 FROM branches WHERE id = $1', [branch_id]);
        if (branchRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return { error: 'branch_not_found' };
        }
      }
      const existsRes = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (existsRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return { error: 'username_exists' };
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
      return { employeeId, userId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function updateEmployee(id, payload) {
    const { full_name, phone, position, branch_id } = payload;
    if (branch_id) {
      const branchRes = await db.query('SELECT 1 FROM branches WHERE id = $1', [branch_id]);
      if (branchRes.rows.length === 0) return { error: 'branch_not_found' };
    }
    const shouldUpdateBranch = Object.prototype.hasOwnProperty.call(payload, 'branch_id');
    const result = await db.query(
      `UPDATE employees
       SET full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           position = COALESCE($4, position),
           branch_id = CASE
             WHEN $5::boolean THEN $6::uuid
             ELSE branch_id
           END
       WHERE id = $1
       RETURNING id, user_id, branch_id, full_name, phone, position`,
      [id, full_name ?? null, phone ?? null, position ?? null, shouldUpdateBranch, branch_id ?? null]
    );
    return result.rows[0] || null;
  }

  async function deleteEmployee(id) {
    const emp = await db.query('SELECT user_id FROM employees WHERE id = $1', [id]);
    if (emp.rows.length === 0) return null;
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    return { user_id: emp.rows[0].user_id };
  }

  async function updateUserStatus(userId, isActive) {
    const result = await db.query('UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id, username, is_active', [userId, isActive]);
    return result.rows[0] || null;
  }

  return {
    listEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    updateUserStatus
  };
};
