module.exports = function createAuthService(deps) {
  const {
    db,
    bcrypt,
    signToken,
    getUserRoles,
    getUserPermissions
  } = deps;

  async function login(username, password) {
    const userRes = await db.query(
      'SELECT id, username, password_hash, is_active FROM users WHERE username = $1',
      [username]
    );
    const user = userRes.rows[0] || null;
    if (!user) return { error: 'invalid_credentials' };
    if (!user.is_active) return { error: 'user_inactive' };
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return { error: 'invalid_credentials' };

    const [roles, permissions] = await Promise.all([
      getUserRoles(user.id),
      getUserPermissions(user.id)
    ]);

    const token = signToken({
      sub: user.id,
      username: user.username,
      roles: roles.map(r => r.name),
      permissions
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        roles: roles.map(r => r.name),
        permissions
      }
    };
  }

  async function getMe(userId) {
    const userRes = await db.query(
      'SELECT id, username, is_active FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0] || null;
    if (!user) return null;

    const employeeRes = await db.query(
      'SELECT id, branch_id, full_name, phone, position FROM employees WHERE user_id = $1',
      [userId]
    );
    const employee = employeeRes.rows[0] || null;

    return {
      user: {
        id: user.id,
        username: user.username,
        is_active: user.is_active
      },
      employee
    };
  }

  return { login, getMe };
};
