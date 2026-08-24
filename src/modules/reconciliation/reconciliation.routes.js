const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validateRequest = require('../../middleware/validateRequest');
const authMiddleware = require('../../middleware/authMiddleware');
const { reviewMatchSchema, createManualMatchSchema } = require('./reconciliation.validation');
const reconciliationController = require('./reconciliation.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/run', asyncHandler(reconciliationController.run));
router.get('/candidates', asyncHandler(reconciliationController.candidates));
router.get('/matches', asyncHandler(reconciliationController.list));
router.get('/matches/:id', asyncHandler(reconciliationController.getOne));
router.patch(
  '/matches/:id',
  validateRequest(reviewMatchSchema),
  asyncHandler(reconciliationController.review)
);
router.post(
  '/matches',
  validateRequest(createManualMatchSchema),
  asyncHandler(reconciliationController.createManual)
);
router.delete('/matches/:id', asyncHandler(reconciliationController.remove));

module.exports = router;
