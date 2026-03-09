module.exports = function createBranchesService(deps) {
  const { db, randomUUID } = deps;

  async function listBranches(allowedBranchIds) {
    if (Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0) {
      const result = await db.query(
        'SELECT id, name, address, latitude, longitude, created_at FROM branches WHERE id = ANY($1) ORDER BY name',
        [allowedBranchIds]
      );
      return result.rows;
    }
    const result = await db.query('SELECT id, name, address, latitude, longitude, created_at FROM branches ORDER BY name');
    return result.rows;
  }

  async function getBranchById(branchId) {
    const result = await db.query(
      'SELECT id, name, address, latitude, longitude, created_at FROM branches WHERE id = $1',
      [branchId]
    );
    return result.rows[0] || null;
  }

  async function createBranch(payload) {
    const { name, address } = payload;
    const result = await db.query(
      'INSERT INTO branches (id, name, address) VALUES ($1, $2, $3) RETURNING id, name, address, latitude, longitude, created_at',
      [randomUUID(), name, address || null]
    );
    return result.rows[0];
  }

  async function updateBranch(branchId, payload) {
    const { name, address } = payload;
    const result = await db.query(
      'UPDATE branches SET name = COALESCE($2, name), address = COALESCE($3, address) WHERE id = $1 RETURNING id, name, address, latitude, longitude, created_at',
      [branchId, name ?? null, address ?? null]
    );
    return result.rows[0] || null;
  }

  async function updateBranchLocation(branchId, payload) {
    const { latitude, longitude } = payload;
    const result = await db.query(
      'UPDATE branches SET latitude = $2, longitude = $3 WHERE id = $1 RETURNING id, name, address, latitude, longitude, created_at',
      [branchId, latitude, longitude]
    );
    return result.rows[0] || null;
  }

  async function deleteBranch(branchId) {
    const result = await db.query('DELETE FROM branches WHERE id = $1 RETURNING id', [branchId]);
    return result.rows[0] || null;
  }

  return {
    listBranches,
    getBranchById,
    createBranch,
    updateBranch,
    updateBranchLocation,
    deleteBranch
  };
};
