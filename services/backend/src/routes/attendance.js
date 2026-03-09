const express = require('express');
const createAttendanceController = require('../controllers/attendanceController');

module.exports = function createAttendanceRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireResourceBranch,
    getEmployeeBranchId
  } = deps;

  const router = express.Router();
  const controller = createAttendanceController(deps);

  router.get('/shifts', authenticate, requirePermission('ATTENDANCE_VIEW'), controller.listShifts);
  router.post('/shifts', authenticate, requirePermission('ATTENDANCE_MANAGE'), controller.createShift);

  router.post('/attendance/checkin',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    (req, res, next) => {
      const { employee_id, shift_id } = req.body || {};
      if (!employee_id || !shift_id) return res.status(400).json({ error: 'employee_shift_required' });
      return next();
    },
    requireResourceBranch(req => getEmployeeBranchId(req.body.employee_id), { notFoundError: 'employee_not_found' }),
    controller.checkIn
  );

  router.post('/attendance/checkout',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    (req, res, next) => {
      const { employee_id } = req.body || {};
      if (!employee_id) return res.status(400).json({ error: 'employee_required' });
      return next();
    },
    requireResourceBranch(req => getEmployeeBranchId(req.body.employee_id), { notFoundError: 'employee_not_found' }),
    controller.checkOut
  );

  router.get('/attendance/logs', authenticate, requirePermission('ATTENDANCE_VIEW'), branchFilter({ column: 'e.branch_id' }), controller.listLogs);

  return router;
};
