const express = require('express');
const createEmployeesController = require('../controllers/employeesController');

module.exports = function createEmployeesRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireResourceBranch,
    requireBranchBody,
    validateBody,
    employeeCreateSchema,
    employeePatchSchema,
    userStatusSchema,
    getEmployeeBranchId
  } = deps;

  const controller = createEmployeesController(deps);
  const router = express.Router();

  router.get('/employees', authenticate, requirePermission('EMPLOYEE_VIEW'), branchFilter({ column: 'e.branch_id' }), controller.listEmployees);
  router.get('/employees/:id', authenticate, requirePermission('EMPLOYEE_VIEW'), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), controller.getEmployee);
  router.post('/employees', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(employeeCreateSchema), requireBranchBody({ bodyKey: 'branch_id' }), controller.createEmployee);
  router.patch('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(employeePatchSchema), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), controller.updateEmployee);
  router.delete('/employees/:id', authenticate, requirePermission('EMPLOYEE_MANAGE'), requireResourceBranch(req => getEmployeeBranchId(req.params.id)), controller.deleteEmployee);
  router.patch('/users/:id/status', authenticate, requirePermission('EMPLOYEE_MANAGE'), validateBody(userStatusSchema), controller.updateUserStatus);

  return router;
};
