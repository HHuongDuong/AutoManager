module.exports = function createAttendanceUtils(deps) {
  const { db } = deps;

  async function getBranchLocation(branchId) {
    const result = await db.query('SELECT id, latitude, longitude FROM branches WHERE id = $1', [branchId]);
    return result.rows[0] || null;
  }

  function haversineMeters(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (Number(deg) * Math.PI) / 180;
    const r = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }

  function getShiftCheckStatus(shiftTime, actualTime) {
    const diffMinutes = Math.round((actualTime - shiftTime) / 60000);
    const status = diffMinutes > 0 ? 'LATE' : diffMinutes < 0 ? 'EARLY' : 'ON_TIME';
    return { status, diff_minutes: diffMinutes };
  }

  return {
    getBranchLocation,
    haversineMeters,
    getShiftCheckStatus
  };
};
