const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  // The browser frontend authenticates via the httpOnly cookie set on login;
  // the Authorization header stays supported for API clients and tests.
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return next(new AppError('Missing or invalid authentication', 401));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
};
