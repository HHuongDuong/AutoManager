const express = require('express');

module.exports = function createReportsRouter(deps) {
  const {
    db,
    authenticate,
    requirePermission,
    branchFilter,
    sendXlsx,
    toCsv
  } = deps;

  const router = express.Router();

  router.get('/reports/revenue', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), async (req, res) => {
    const { from, to, group_by = 'day' } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = ["payment_status = 'PAID'"];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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

  router.get('/reports/revenue/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), async (req, res) => {
    const { from, to, group_by = 'day', format = 'csv' } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = ["payment_status = 'PAID'"];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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
    if (format === 'xlsx') return await sendXlsx(res, result.rows, 'Revenue', 'revenue_report.xlsx');
    if (format !== 'csv') return res.json(result.rows);
    const csv = toCsv(result.rows, [
      { key: 'bucket', label: 'bucket' },
      { key: 'orders', label: 'orders' },
      { key: 'revenue', label: 'revenue' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.csv"');
    return res.send(csv);
  });

  router.get('/reports/inventory', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), async (req, res) => {
    const { ingredient_id, from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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

  router.get('/reports/inventory/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter(), async (req, res) => {
    const { ingredient_id, from, to, format = 'csv' } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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
    if (format === 'xlsx') return await sendXlsx(res, result.rows, 'Inventory', 'inventory_report.xlsx');
    if (format !== 'csv') return res.json(result.rows);
    const csv = toCsv(result.rows, [
      { key: 'ingredient_id', label: 'ingredient_id' },
      { key: 'total_in', label: 'total_in' },
      { key: 'total_out', label: 'total_out' },
      { key: 'total_adjust', label: 'total_adjust' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
    return res.send(csv);
  });

  router.get('/reports/attendance', authenticate, requirePermission('REPORT_VIEW'), branchFilter({ column: 'e.branch_id' }), async (req, res) => {
    const { from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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

  router.get('/reports/attendance/export', authenticate, requirePermission('REPORT_VIEW'), branchFilter({ column: 'e.branch_id' }), async (req, res) => {
    const { from, to, format = 'csv' } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
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
    if (format === 'xlsx') return await sendXlsx(res, result.rows, 'Attendance', 'attendance_report.xlsx');
    if (format !== 'csv') return res.json(result.rows);
    const csv = toCsv(result.rows, [
      { key: 'employee_id', label: 'employee_id' },
      { key: 'full_name', label: 'full_name' },
      { key: 'total_hours', label: 'total_hours' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    return res.send(csv);
  });

  return router;
};
