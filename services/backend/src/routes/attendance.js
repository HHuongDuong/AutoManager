const express = require('express');

module.exports = function createAttendanceRouter(deps) {
  const {
    db,
    randomUUID,
    authenticate,
    requirePermission,
    branchFilter,
    requireResourceBranch,
    getEmployeeBranchId,
    getBranchLocation,
    haversineMeters,
    getShiftCheckStatus,
    writeAuditLog,
    publishRealtime
  } = deps;

  const router = express.Router();

  router.get('/shifts', authenticate, requirePermission('ATTENDANCE_VIEW'), async (req, res) => {
    const result = await db.query('SELECT id, name, start_time, end_time FROM shifts ORDER BY start_time');
    return res.json(result.rows);
  });

  router.post('/shifts', authenticate, requirePermission('ATTENDANCE_MANAGE'), async (req, res) => {
    const { name, start_time, end_time } = req.body || {};
    if (!name || !start_time || !end_time) return res.status(400).json({ error: 'name_start_end_required' });
    const existsRes = await db.query(
      'SELECT 1 FROM shifts WHERE name = $1 AND start_time = $2 AND end_time = $3',
      [name, start_time, end_time]
    );
    if (existsRes.rows.length > 0) return res.status(409).json({ error: 'shift_exists' });
    const result = await db.query(
      'INSERT INTO shifts (id, name, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING id, name, start_time, end_time',
      [randomUUID(), name, start_time, end_time]
    );
    await writeAuditLog(req, 'SHIFT_CREATE', 'shift', result.rows[0].id, { name });
    publishRealtime('shift.created', result.rows[0], null);
    return res.status(201).json(result.rows[0]);
  });

  router.post('/attendance/checkin',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    (req, res, next) => {
      const { employee_id, shift_id } = req.body || {};
      if (!employee_id || !shift_id) return res.status(400).json({ error: 'employee_shift_required' });
      return next();
    },
    requireResourceBranch(req => getEmployeeBranchId(req.body.employee_id), { notFoundError: 'employee_not_found' }),
    async (req, res) => {
    const { employee_id, shift_id, latitude, longitude } = req.body || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'location_required' });
    }
    const branch = await getBranchLocation(req.resourceBranchId);
    if (!branch || branch.latitude == null || branch.longitude == null) {
      return res.status(400).json({ error: 'branch_location_missing' });
    }
    const distance = haversineMeters(latitude, longitude, Number(branch.latitude), Number(branch.longitude));
    if (distance > 50) {
      return res.status(400).json({ error: 'too_far', distance_m: Math.round(distance), max_distance_m: 50 });
    }
    const shiftRes = await db.query('SELECT id, name, start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
    const shift = shiftRes.rows[0];
    if (!shift) return res.status(404).json({ error: 'shift_not_found' });
    const now = new Date();
    const [startHour, startMinute] = String(shift.start_time).split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(startHour || 0, startMinute || 0, 0, 0);
    const checkStatus = getShiftCheckStatus(shiftStart, now);
    const openRes = await db.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
      [employee_id]
    );
    if (openRes.rows.length > 0) return res.status(409).json({ error: 'already_checked_in' });
    const result = await db.query(
      'INSERT INTO attendance (id, employee_id, shift_id, check_in) VALUES ($1, $2, $3, now()) RETURNING id, employee_id, shift_id, check_in',
      [randomUUID(), employee_id, shift_id]
    );
    await writeAuditLog(req, 'ATTENDANCE_CHECKIN', 'attendance', result.rows[0].id, {
      employee_id,
      shift_id,
      distance_m: Math.round(distance),
      check_in_status: checkStatus.status,
      check_in_diff_minutes: checkStatus.diff_minutes
    });
    publishRealtime('attendance.checkin', result.rows[0], req.resourceBranchId);
    return res.status(201).json({
      ...result.rows[0],
      distance_m: Math.round(distance),
      check_in_status: checkStatus.status,
      check_in_diff_minutes: checkStatus.diff_minutes
    });
  });

  router.post('/attendance/checkout',
    authenticate,
    requirePermission('ATTENDANCE_MANAGE'),
    (req, res, next) => {
      const { employee_id } = req.body || {};
      if (!employee_id) return res.status(400).json({ error: 'employee_required' });
      return next();
    },
    requireResourceBranch(req => getEmployeeBranchId(req.body.employee_id), { notFoundError: 'employee_not_found' }),
    async (req, res) => {
    const { employee_id, latitude, longitude } = req.body || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'location_required' });
    }
    const branch = await getBranchLocation(req.resourceBranchId);
    if (!branch || branch.latitude == null || branch.longitude == null) {
      return res.status(400).json({ error: 'branch_location_missing' });
    }
    const distance = haversineMeters(latitude, longitude, Number(branch.latitude), Number(branch.longitude));
    if (distance > 50) {
      return res.status(400).json({ error: 'too_far', distance_m: Math.round(distance), max_distance_m: 50 });
    }
    const result = await db.query(
      'UPDATE attendance SET check_out = now() WHERE employee_id = $1 AND check_out IS NULL RETURNING id, employee_id, shift_id, check_in, check_out',
      [employee_id]
    );
    if (result.rows.length === 0) return res.status(409).json({ error: 'not_checked_in' });
    const shiftRes = await db.query('SELECT id, name, start_time, end_time FROM shifts WHERE id = $1', [result.rows[0].shift_id]);
    const shift = shiftRes.rows[0];
    let checkOutStatus = null;
    if (shift) {
      const now = new Date();
      const [endHour, endMinute] = String(shift.end_time).split(':').map(Number);
      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHour || 0, endMinute || 0, 0, 0);
      checkOutStatus = getShiftCheckStatus(shiftEnd, now);
    }
    await writeAuditLog(req, 'ATTENDANCE_CHECKOUT', 'attendance', result.rows[0].id, {
      employee_id,
      distance_m: Math.round(distance),
      check_out_status: checkOutStatus?.status || null,
      check_out_diff_minutes: checkOutStatus?.diff_minutes ?? null
    });
    publishRealtime('attendance.checkout', result.rows[0], req.resourceBranchId);
    return res.json({
      ...result.rows[0],
      distance_m: Math.round(distance),
      check_out_status: checkOutStatus?.status || null,
      check_out_diff_minutes: checkOutStatus?.diff_minutes ?? null
    });
  });

  router.get('/attendance/logs', authenticate, requirePermission('ATTENDANCE_VIEW'), branchFilter({ column: 'e.branch_id' }), async (req, res) => {
    const { employee_id, from, to } = req.query || {};
    const params = [...(req.branchFilter?.params || [])];
    const filters = [];
    if (employee_id) { params.push(employee_id); filters.push(`a.employee_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
    if (req.branchFilter?.where) filters.push(req.branchFilter.where.replace(/^WHERE /, ''));
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT a.id, a.employee_id, e.full_name, e.branch_id,
              a.shift_id, s.name AS shift_name, s.start_time, s.end_time,
              a.check_in, a.check_out
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN shifts s ON s.id = a.shift_id
       ${where}
       ORDER BY a.check_in DESC`,
      params
    );
    const rows = result.rows.map(row => {
      const checkIn = row.check_in ? new Date(row.check_in) : null;
      const checkOut = row.check_out ? new Date(row.check_out) : null;
      let checkInStatus = null;
      let checkOutStatus = null;
      if (row.start_time && checkIn) {
        const [h, m] = String(row.start_time).split(':').map(Number);
        const shiftStart = new Date(checkIn);
        shiftStart.setHours(h || 0, m || 0, 0, 0);
        checkInStatus = getShiftCheckStatus(shiftStart, checkIn);
      }
      if (row.end_time && checkOut) {
        const [h, m] = String(row.end_time).split(':').map(Number);
        const shiftEnd = new Date(checkOut);
        shiftEnd.setHours(h || 0, m || 0, 0, 0);
        checkOutStatus = getShiftCheckStatus(shiftEnd, checkOut);
      }
      return {
        ...row,
        check_in_status: checkInStatus?.status || null,
        check_in_diff_minutes: checkInStatus?.diff_minutes ?? null,
        check_out_status: checkOutStatus?.status || null,
        check_out_diff_minutes: checkOutStatus?.diff_minutes ?? null
      };
    });
    return res.json(rows);
  });

  return router;
};
