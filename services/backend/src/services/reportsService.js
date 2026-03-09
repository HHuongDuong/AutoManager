module.exports = function createReportsService(deps) {
  const { db } = deps;

  async function listRevenue(filter) {
    const { branchFilter, from, to, group_by = 'day' } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = ["payment_status = 'PAID'"];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
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
    return result.rows;
  }

  async function listInventory(filter) {
    const { branchFilter, ingredient_id, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
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
    return result.rows;
  }

  async function listAttendance(filter) {
    const { branchFilter, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
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
    return result.rows;
  }

  return {
    listRevenue,
    listInventory,
    listAttendance
  };
};
