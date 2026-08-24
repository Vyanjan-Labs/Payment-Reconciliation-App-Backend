const paymentService = require('./payment.service');
const AppError = require('../../utils/AppError');

async function upload(req, res) {
  if (!req.file) {
    throw new AppError('No file uploaded. Attach a file under the "file" field.', 400);
  }
  const summary = await paymentService.uploadFile(req.file);
  res.status(201).json(summary);
}

async function list(req, res) {
  const payments = await paymentService.listPayments(req.query);
  res.status(200).json({ payments });
}

async function getOne(req, res) {
  const payment = await paymentService.getPayment(req.params.id);
  res.status(200).json({ payment });
}

module.exports = { upload, list, getOne };
