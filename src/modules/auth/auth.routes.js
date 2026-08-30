const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validateRequest = require('../../middleware/validateRequest');
const authMiddleware = require('../../middleware/authMiddleware');
const { signupSchema, loginSchema } = require('./auth.validation');
const authController = require('./auth.controller');

const router = express.Router();

router.post('/signup', validateRequest(signupSchema), asyncHandler(authController.signup));
router.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authMiddleware, asyncHandler(authController.me));

module.exports = router;

