const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requirePermission(code) {
  return (req, res, next) => {
    if (process.env.RBAC_BYPASS === 'true') return next();
    const perms = req.user?.permissions || [];
    if (perms.includes(code)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

module.exports = { signToken, authenticate, requirePermission };
