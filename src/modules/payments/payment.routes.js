const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const authMiddleware = require('../../middleware/authMiddleware');
const upload = require('./payment.upload');
const paymentController = require('./payment.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/upload', upload.single('file'), asyncHandler(paymentController.upload));
router.get('/', asyncHandler(paymentController.list));
router.get('/:id', asyncHandler(paymentController.getOne));

module.exports = router;
