module.exports = function createTablesService(deps) {
  const { db, randomUUID } = deps;

  async function listTables(filter) {
    const { branchFilter } = filter;
    const { where, params } = branchFilter || { where: '', params: [] };
    const result = await db.query(
      `SELECT t.id,
              t.branch_id,
              t.name,
              CASE
                WHEN EXISTS (
                  SELECT 1
                  FROM orders o
                  WHERE o.table_id = t.id
                    AND o.order_type = 'DINE_IN'
                    AND o.order_status NOT IN ('CANCELLED', 'CLOSED')
                ) THEN 'OCCUPIED'
                ELSE COALESCE(t.status, 'AVAILABLE')
              END AS status
       FROM tables t
       ${where}
       ORDER BY t.name`,
      params
    );
    return result.rows;
  }

  async function createTable(payload) {
    const { branch_id, name, status } = payload;
    const existsRes = await db.query('SELECT 1 FROM tables WHERE branch_id = $1 AND name = $2', [branch_id, name]);
    if (existsRes.rows.length > 0) return { error: 'table_exists' };
    const result = await db.query(
      'INSERT INTO tables (id, branch_id, name, status) VALUES ($1, $2, $3, $4) RETURNING id, branch_id, name, status',
      [randomUUID(), branch_id, name, status || 'AVAILABLE']
    );
    return result.rows[0];
  }

  async function updateTable(id, payload) {
    const { name, status } = payload;
    const result = await db.query(
      'UPDATE tables SET name = COALESCE($2, name), status = COALESCE($3, status) WHERE id = $1 RETURNING id, branch_id, name, status',
      [id, name ?? null, status ?? null]
    );
    return result.rows[0] || null;
  }

  async function deleteTable(id) {
    const result = await db.query('DELETE FROM tables WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  async function updateTableStatus(id, status) {
    const result = await db.query('UPDATE tables SET status = $2 WHERE id = $1 RETURNING id, branch_id, name, status', [id, status]);
    return result.rows[0] || null;
  }

  return {
    listTables,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus
  };
};
