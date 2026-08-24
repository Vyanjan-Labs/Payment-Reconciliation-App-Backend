const Joi = require('joi');

const signupSchema = Joi.object({
  firstName: Joi.string().min(1).max(255).required(),
  lastName: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().max(255).required(),
  // bcrypt silently ignores anything past 72 bytes, so we cap it here
  password: Joi.string().min(8).max(72).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().required(),
});

module.exports = { signupSchema, loginSchema };
