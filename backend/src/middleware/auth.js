import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { error } from '../utils/response.js';

export function requireAuth(req, res, next) {
  const token = req.session?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json(error('Authentication required', 'UNAUTHORIZED', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(error('Invalid or expired token', 'INVALID_TOKEN', 401));
  }
}

export function optionalAuth(req, res, next) {
  const token = req.session?.token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    } catch (err) {
      // Token invalid but continue anyway
    }
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json(error('Admin access required', 'FORBIDDEN', 403));
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.adminRole || !['super_admin', 'admin', 'support_staff'].includes(req.user.adminRole)) {
      return res.status(403).json(error('Insufficient permissions', 'FORBIDDEN', 403));
    }

    const roleHierarchy = {
      super_admin: 3,
      admin: 2,
      support_staff: 1,
    };

    if (roleHierarchy[req.user.adminRole] < roleHierarchy[role]) {
      return res.status(403).json(error('Insufficient permissions', 'FORBIDDEN', 403));
    }

    next();
  };
}
