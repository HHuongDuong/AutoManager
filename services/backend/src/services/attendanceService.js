module.exports = function createAttendanceService(deps) {
  const {
    db,
    randomUUID,
    getBranchLocation,
    haversineMeters,
    getShiftCheckStatus
  } = deps;

  async function listShifts() {
    const result = await db.query('SELECT id, name, start_time, end_time FROM shifts ORDER BY start_time');
    return result.rows;
  }

  async function createShift(payload) {
    const { name, start_time, end_time } = payload;
    const existsRes = await db.query(
      'SELECT 1 FROM shifts WHERE name = $1 AND start_time = $2 AND end_time = $3',
      [name, start_time, end_time]
    );
    if (existsRes.rows.length > 0) return { error: 'shift_exists' };
    const result = await db.query(
      'INSERT INTO shifts (id, name, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING id, name, start_time, end_time',
      [randomUUID(), name, start_time, end_time]
    );
    return result.rows[0];
  }

  async function checkIn(payload) {
    const { employee_id, shift_id, latitude, longitude, branch_id, createdBy } = payload;
    const employeeRes = await db.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
    if (employeeRes.rows.length === 0) return { error: 'employee_not_found' };
    const branch = await getBranchLocation(branch_id);
    if (!branch || branch.latitude == null || branch.longitude == null) {
      return { error: 'branch_location_missing' };
    }
    const distance = haversineMeters(latitude, longitude, Number(branch.latitude), Number(branch.longitude));
    if (distance > 50) {
      return { error: 'too_far', distance_m: Math.round(distance), max_distance_m: 50 };
    }
    const shiftRes = await db.query('SELECT id, name, start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
    const shift = shiftRes.rows[0];
    if (!shift) return { error: 'shift_not_found' };
    const now = new Date();
    const [startHour, startMinute] = String(shift.start_time).split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(startHour || 0, startMinute || 0, 0, 0);
    const checkStatus = getShiftCheckStatus(shiftStart, now);
    const openRes = await db.query(
      'SELECT id, branch_id FROM attendance WHERE employee_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
      [employee_id]
    );
    if (openRes.rows.length > 0) {
      return { error: 'already_checked_in', open_branch_id: openRes.rows[0].branch_id };
    }
    const result = await db.query(
      'INSERT INTO attendance (id, employee_id, branch_id, shift_id, check_in) VALUES ($1, $2, $3, $4, now()) RETURNING id, employee_id, branch_id, shift_id, check_in',
      [randomUUID(), employee_id, branch_id, shift_id]
    );
    return {
      record: result.rows[0],
      distance_m: Math.round(distance),
      checkStatus
    };
  }

  async function checkOut(payload) {
    const { employee_id, latitude, longitude, branch_id } = payload;
    const employeeRes = await db.query('SELECT id FROM employees WHERE id = $1', [employee_id]);
    if (employeeRes.rows.length === 0) return { error: 'employee_not_found' };
    const branch = await getBranchLocation(branch_id);
    if (!branch || branch.latitude == null || branch.longitude == null) {
      return { error: 'branch_location_missing' };
    }
    const distance = haversineMeters(latitude, longitude, Number(branch.latitude), Number(branch.longitude));
    if (distance > 50) {
      return { error: 'too_far', distance_m: Math.round(distance), max_distance_m: 50 };
    }
    const result = await db.query(
      'UPDATE attendance SET check_out = now() WHERE employee_id = $1 AND branch_id = $2 AND check_out IS NULL RETURNING id, employee_id, branch_id, shift_id, check_in, check_out',
      [employee_id, branch_id]
    );
    if (result.rows.length === 0) {
      const openRes = await db.query(
        'SELECT branch_id FROM attendance WHERE employee_id = $1 AND check_out IS NULL ORDER BY check_in DESC LIMIT 1',
        [employee_id]
      );
      if (openRes.rows.length > 0) {
        return { error: 'checked_in_other_branch', open_branch_id: openRes.rows[0].branch_id };
      }
      return { error: 'not_checked_in' };
    }
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
    return {
      record: result.rows[0],
      distance_m: Math.round(distance),
      checkOutStatus
    };
  }

  async function listLogs(filter) {
    const { branchFilter, employee_id, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (employee_id) { params.push(employee_id); filters.push(`a.employee_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`a.check_in >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`a.check_out <= $${params.length}`); }
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT a.id, a.employee_id, e.full_name, a.branch_id,
              a.shift_id, s.name AS shift_name, s.start_time, s.end_time,
               a.check_in, a.check_out
        FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN shifts s ON s.id = a.shift_id
       ${where}
       ORDER BY a.check_in DESC`,
      params
    );
    return result.rows.map(row => {
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
  }

  return {
    listShifts,
    createShift,
    checkIn,
    checkOut,
    listLogs
  };
};
