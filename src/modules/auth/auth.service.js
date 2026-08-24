const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');

const SALT_ROUNDS = 10;

// The database uses snake_case columns; the API responds in camelCase.
// Keeping that translation here means the rest of the app never sees snake_case.
function toUserResponse(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    createdAt: user.created_at,
  };
}

async function signup({ firstName, lastName, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await authRepository.createUser({ firstName, lastName, email, passwordHash });
  return toUserResponse(user);
}

async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign({ userId: user.id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  return {
    token,
    user: toUserResponse(user),
  };
}

async function getProfile(userId) {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toUserResponse(user);
}

module.exports = { signup, login, getProfile };
