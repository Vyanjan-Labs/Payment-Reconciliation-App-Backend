const authService = require('./auth.service');

const AUTH_COOKIE_NAME = 'token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // keep in sync with env.jwtExpiresIn

// sameSite: 'lax' + secure only in production works because this backend and
// its browser frontend share a hostname (just different ports) in dev, which
// browsers treat as "same-site". A frontend on a genuinely different domain
// in production would need sameSite: 'none' (which requires secure: true).
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

async function signup(req, res) {
  const user = await authService.signup(req.body);
  res.status(201).json({ user });
}

async function login(req, res) {
  const { token, user } = await authService.login(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: SEVEN_DAYS_MS });
  // The token is still included here for API clients and the test suite,
  // which authenticate via the Authorization header rather than the cookie.
  res.status(200).json({ token, user });
}

async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.status(200).json({ user });
}

async function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, COOKIE_OPTIONS);
  res.status(204).send();
}

module.exports = { signup, login, me, logout };
