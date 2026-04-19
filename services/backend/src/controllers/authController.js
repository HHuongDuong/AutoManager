const createAuthService = require('../services/authService');

module.exports = function createAuthController(deps) {
  const authService = createAuthService(deps);

  function parseExpiresInSeconds(value) {
    if (!value) return 3600;
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    if (/^\d+$/.test(str)) return Number(str);
    const match = str.match(/^(\d+)([smhd])$/i);
    if (!match) return 3600;
    const qty = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 's') return qty;
    if (unit === 'm') return qty * 60;
    if (unit === 'h') return qty * 3600;
    if (unit === 'd') return qty * 86400;
    return 3600;
  }

  async function login(req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_password_required' });
    const result = await authService.login(username, password);
    if (result?.error === 'user_inactive') return res.status(403).json({ error: 'user_inactive' });
    if (result?.error) return res.status(401).json({ error: 'invalid_credentials' });

    const expiresIn = parseExpiresInSeconds(process.env.JWT_EXPIRES || '1h');
    return res.json({
      access_token: result.token,
      expires_in: expiresIn,
      user: result.user
    });
  }

  async function me(req, res) {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const profile = await authService.getMe(userId);
    if (!profile) return res.status(404).json({ error: 'not_found' });
    return res.json(profile);
  }

  return { login, me };
};
