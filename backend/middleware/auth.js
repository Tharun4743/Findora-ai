const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'findora_hackathon_secret_2026_super_secure';

/**
 * Validates JWT bearer token and attaches req.user
 * Never falls back to default admin on missing/invalid token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      req.user = null;
      return next();
    }

    try {
      const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(decoded.id);
      if (user) {
        req.user = {
          ...user,
          role: user.role === 'user' ? 'student' : user.role
        };
      } else {
        req.user = {
          ...decoded,
          role: decoded.role === 'user' ? 'student' : decoded.role
        };
      }
    } catch {
      req.user = {
        ...decoded,
        role: decoded.role === 'user' ? 'student' : decoded.role
      };
    }
    next();
  });
}

/**
 * Requires any valid authenticated session (student, verification_officer, admin)
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to Findora Vault.' });
  }
  next();
}

/**
 * Allows only Verification Officers and Admins (blocks students)
 */
function requireOfficerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (req.user.role === 'admin' || req.user.role === 'verification_officer') {
    return next();
  }
  return res.status(403).json({ 
    error: 'Access denied: Requires Verification Officer or Administrator authorization.' 
  });
}

/**
 * Allows only Super Admins (blocks verification_officer and students)
 */
function requireAdminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    error: 'Access denied: Requires Institutional Administrator privileges.' 
  });
}

const requireAdmin = requireOfficerOrAdmin;

module.exports = {
  authenticateToken,
  requireAuth,
  requireOfficerOrAdmin,
  requireAdminOnly,
  requireAdmin,
  JWT_SECRET
};
