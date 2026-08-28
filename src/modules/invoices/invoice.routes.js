const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validateRequest = require('../../middleware/validateRequest');
const authMiddleware = require('../../middleware/authMiddleware');
const fileUpload = require('../../middleware/fileUpload');
const { createInvoiceSchema, updateInvoiceSchema } = require('./invoice.validation');
const invoiceController = require('./invoice.controller');

const router = express.Router();

router.use(authMiddleware);

router.post('/', validateRequest(createInvoiceSchema), asyncHandler(invoiceController.create));
router.post('/upload', fileUpload.single('file'), asyncHandler(invoiceController.upload));
router.get('/', asyncHandler(invoiceController.list));
router.get('/:id', asyncHandler(invoiceController.getOne));
router.put('/:id', validateRequest(updateInvoiceSchema), asyncHandler(invoiceController.update));
router.delete('/:id', asyncHandler(invoiceController.remove));

module.exports = router;
