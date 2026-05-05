const createEmployeesService = require('../services/employeesService');

module.exports = function createEmployeesController(deps) {
  const {
    ensureBranchAccess,
    writeAuditLog,
    publishRealtime
  } = deps;

  const employeesService = createEmployeesService(deps);

  async function listEmployees(req, res) {
    const rows = await employeesService.listEmployees(req.branchFilter);
    return res.json(rows);
  }

  async function getEmployee(req, res) {
    const employee = await employeesService.getEmployeeById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'not_found' });
    return res.json(employee);
  }

  async function createEmployee(req, res) {
    try {
      const { username, password, branch_id, full_name, phone, position } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
      const result = await employeesService.createEmployee({ username, password, branch_id, full_name, phone, position });
      if (result?.error === 'branch_not_found') return res.status(400).json({ error: 'branch_not_found' });
      if (result?.error === 'username_exists') return res.status(409).json({ error: 'username_exists' });
      await writeAuditLog(req, 'EMPLOYEE_CREATE', 'employee', result.employeeId, { username, branch_id });
      publishRealtime('employee.created', { id: result.employeeId, user_id: result.userId, username, full_name, phone, position, branch_id: branch_id || null }, branch_id || null);
      return res.status(201).json({ id: result.employeeId, user_id: result.userId, username, full_name, phone, position, branch_id });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'unique_violation', detail: err.detail || err.message });
      if (err.code === '22P02') return res.status(400).json({ error: 'invalid_input', detail: err.detail || err.message });
      return res.status(500).json({ error: 'employee_create_failed', detail: err.message });
    }
  }

  async function updateEmployee(req, res) {
    try {
      const { full_name, phone, position, branch_id } = req.body || {};
      const current = await employeesService.getEmployeeById(req.params.id);
      if (!current) return res.status(404).json({ error: 'not_found' });

      if (current.branch_id && !(await ensureBranchAccess(req, current.branch_id))) {
        return res.status(403).json({ error: 'branch_forbidden' });
      }
      if (branch_id && !(await ensureBranchAccess(req, branch_id))) {
        return res.status(403).json({ error: 'branch_forbidden' });
      }

      const result = await employeesService.updateEmployee(req.params.id, { full_name, phone, position, branch_id });
      if (result?.error === 'branch_not_found') return res.status(400).json({ error: 'branch_not_found' });
      await writeAuditLog(req, 'EMPLOYEE_UPDATE', 'employee', req.params.id, req.body);
      publishRealtime('employee.updated', result, result.branch_id || null);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: 'employee_update_failed', detail: err.message });
    }
  }

  async function deleteEmployee(req, res) {
    try {
      const result = await employeesService.deleteEmployee(req.params.id);
      if (!result) return res.status(404).json({ error: 'not_found' });
      await writeAuditLog(req, 'EMPLOYEE_DELETE', 'employee', req.params.id, {});
      publishRealtime('employee.deleted', { id: req.params.id }, req.resourceBranchId || null);
      return res.json({ deleted: true });
    } catch (err) {
      return res.status(500).json({ error: 'employee_delete_failed', detail: err.message });
    }
  }

  async function updateUserStatus(req, res) {
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active_required' });
    const result = await employeesService.updateUserStatus(req.params.id, is_active);
    if (!result) return res.status(404).json({ error: 'not_found' });
    await writeAuditLog(req, 'USER_STATUS_UPDATE', 'user', req.params.id, { is_active });
    publishRealtime('user.status.updated', { id: result.id, username: result.username, is_active }, null);
    return res.json(result);
  }

  return {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    updateUserStatus
  };
};
