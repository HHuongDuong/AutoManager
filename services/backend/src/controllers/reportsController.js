const createReportsService = require('../services/reportsService');

module.exports = function createReportsController(deps) {
  const { sendXlsx, toCsv } = deps;
  const reportsService = createReportsService(deps);

  async function listRevenue(req, res) {
    const { from, to, group_by = 'day' } = req.query || {};
    const rows = await reportsService.listRevenue({ branchFilter: req.branchFilter, from, to, group_by });
    return res.json(rows);
  }

  async function exportRevenue(req, res) {
    const { from, to, group_by = 'day', format = 'csv' } = req.query || {};
    const rows = await reportsService.listRevenue({ branchFilter: req.branchFilter, from, to, group_by });
    if (format === 'xlsx') return await sendXlsx(res, rows, 'Revenue', 'revenue_report.xlsx');
    if (format !== 'csv') return res.json(rows);
    const csv = toCsv(rows, [
      { key: 'bucket', label: 'bucket' },
      { key: 'orders', label: 'orders' },
      { key: 'revenue', label: 'revenue' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue_report.csv"');
    return res.send(csv);
  }

  async function listInventory(req, res) {
    const { ingredient_id, from, to } = req.query || {};
    const rows = await reportsService.listInventory({ branchFilter: req.branchFilter, ingredient_id, from, to });
    return res.json(rows);
  }

  async function exportInventory(req, res) {
    const { ingredient_id, from, to, format = 'csv' } = req.query || {};
    const rows = await reportsService.listInventory({ branchFilter: req.branchFilter, ingredient_id, from, to });
    if (format === 'xlsx') return await sendXlsx(res, rows, 'Inventory', 'inventory_report.xlsx');
    if (format !== 'csv') return res.json(rows);
    const csv = toCsv(rows, [
      { key: 'ingredient_id', label: 'ingredient_id' },
      { key: 'total_in', label: 'total_in' },
      { key: 'total_out', label: 'total_out' },
      { key: 'total_adjust', label: 'total_adjust' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_report.csv"');
    return res.send(csv);
  }

  async function listAttendance(req, res) {
    const { from, to } = req.query || {};
    const rows = await reportsService.listAttendance({ branchFilter: req.branchFilter, from, to });
    return res.json(rows);
  }

  async function exportAttendance(req, res) {
    const { from, to, format = 'csv' } = req.query || {};
    const rows = await reportsService.listAttendance({ branchFilter: req.branchFilter, from, to });
    if (format === 'xlsx') return await sendXlsx(res, rows, 'Attendance', 'attendance_report.xlsx');
    if (format !== 'csv') return res.json(rows);
    const csv = toCsv(rows, [
      { key: 'employee_id', label: 'employee_id' },
      { key: 'full_name', label: 'full_name' },
      { key: 'total_hours', label: 'total_hours' }
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.csv"');
    return res.send(csv);
  }

  return {
    listRevenue,
    exportRevenue,
    listInventory,
    exportInventory,
    listAttendance,
    exportAttendance
  };
};
