const createAttendanceService = require('../services/attendanceService');

module.exports = function createAttendanceController(deps) {
  const { writeAuditLog, publishRealtime } = deps;
  const attendanceService = createAttendanceService(deps);

  async function listShifts(req, res) {
    const rows = await attendanceService.listShifts();
    return res.json(rows);
  }

  async function createShift(req, res) {
    const { name, start_time, end_time } = req.body || {};
    if (!name || !start_time || !end_time) return res.status(400).json({ error: 'name_start_end_required' });
    const result = await attendanceService.createShift({ name, start_time, end_time });
    if (result?.error === 'shift_exists') return res.status(409).json({ error: 'shift_exists' });
    await writeAuditLog(req, 'SHIFT_CREATE', 'shift', result.id, { name });
    publishRealtime('shift.created', result, null);
    return res.status(201).json(result);
  }

  async function checkIn(req, res) {
    const { employee_id, shift_id, latitude, longitude } = req.body || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'location_required' });
    }
    const result = await attendanceService.checkIn({
      employee_id,
      shift_id,
      latitude,
      longitude,
      branch_id: req.resourceBranchId,
      createdBy: req.user.sub
    });
    if (result?.error === 'branch_location_missing') return res.status(400).json({ error: 'branch_location_missing' });
    if (result?.error === 'too_far') {
      return res.status(400).json({ error: 'too_far', distance_m: result.distance_m, max_distance_m: result.max_distance_m });
    }
    if (result?.error === 'shift_not_found') return res.status(404).json({ error: 'shift_not_found' });
    if (result?.error === 'already_checked_in') return res.status(409).json({ error: 'already_checked_in' });

    await writeAuditLog(req, 'ATTENDANCE_CHECKIN', 'attendance', result.record.id, {
      employee_id,
      shift_id,
      distance_m: result.distance_m,
      check_in_status: result.checkStatus.status,
      check_in_diff_minutes: result.checkStatus.diff_minutes
    });
    publishRealtime('attendance.checkin', result.record, req.resourceBranchId);
    return res.status(201).json({
      ...result.record,
      distance_m: result.distance_m,
      check_in_status: result.checkStatus.status,
      check_in_diff_minutes: result.checkStatus.diff_minutes
    });
  }

  async function checkOut(req, res) {
    const { employee_id, latitude, longitude } = req.body || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'location_required' });
    }
    const result = await attendanceService.checkOut({
      employee_id,
      latitude,
      longitude,
      branch_id: req.resourceBranchId,
      createdBy: req.user.sub
    });
    if (result?.error === 'branch_location_missing') return res.status(400).json({ error: 'branch_location_missing' });
    if (result?.error === 'too_far') {
      return res.status(400).json({ error: 'too_far', distance_m: result.distance_m, max_distance_m: result.max_distance_m });
    }
    if (result?.error === 'not_checked_in') return res.status(409).json({ error: 'not_checked_in' });

    await writeAuditLog(req, 'ATTENDANCE_CHECKOUT', 'attendance', result.record.id, {
      employee_id,
      distance_m: result.distance_m,
      check_out_status: result.checkOutStatus?.status || null,
      check_out_diff_minutes: result.checkOutStatus?.diff_minutes ?? null
    });
    publishRealtime('attendance.checkout', result.record, req.resourceBranchId);
    return res.json({
      ...result.record,
      distance_m: result.distance_m,
      check_out_status: result.checkOutStatus?.status || null,
      check_out_diff_minutes: result.checkOutStatus?.diff_minutes ?? null
    });
  }

  async function listLogs(req, res) {
    const { employee_id, from, to } = req.query || {};
    const rows = await attendanceService.listLogs({ branchFilter: req.branchFilter, employee_id, from, to });
    return res.json(rows);
  }

  return {
    listShifts,
    createShift,
    checkIn,
    checkOut,
    listLogs
  };
};
