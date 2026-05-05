const express = require('express');
const createAttendanceController = require('../controllers/attendanceController');

module.exports = function createAttendanceRouter(deps) {
  const {
    authenticate,
    requirePermission,
    branchFilter,
    requireBranchBody
  } = deps;

  const router = express.Router();
  const controller = createAttendanceController(deps);

  router.get('/shifts', authenticate, requirePermission('ATTENDANCE_VIEW'), controller.listShifts);
  router.post('/shifts', authenticate, requirePermission('ATTENDANCE_MANAGE'), controller.createShift);

  router.post('/attendance/checkin',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    requireBranchBody({ bodyKey: 'branch_id', required: true }),
    (req, res, next) => {
      const { employee_id, shift_id, branch_id } = req.body || {};
      if (!employee_id || !shift_id || !branch_id) return res.status(400).json({ error: 'employee_shift_branch_required' });
      return next();
    },
    controller.checkIn
  );

  router.post('/attendance/checkout',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    requireBranchBody({ bodyKey: 'branch_id', required: true }),
    (req, res, next) => {
      const { employee_id, branch_id } = req.body || {};
      if (!employee_id || !branch_id) return res.status(400).json({ error: 'employee_branch_required' });
      return next();
    },
    controller.checkOut
  );

  router.get('/attendance/logs', authenticate, requirePermission('ATTENDANCE_VIEW'), branchFilter({ column: 'a.branch_id' }), controller.listLogs);

  return router;
};
