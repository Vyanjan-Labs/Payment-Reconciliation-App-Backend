const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const authMiddleware = require('../../middleware/authMiddleware');
const reportController = require('./report.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', asyncHandler(reportController.summary));

module.exports = router;
