const authService = require('./auth.service');

async function signup(req, res) {
  const user = await authService.signup(req.body);
  res.status(201).json({ user });
}

async function login(req, res) {
  const { token, user } = await authService.login(req.body);
  res.status(200).json({ token, user });
}

async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.status(200).json({ user });
}

module.exports = { signup, login, me };
