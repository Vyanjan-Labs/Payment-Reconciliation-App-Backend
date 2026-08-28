const invoiceService = require('./invoice.service');
const AppError = require('../../utils/AppError');

async function create(req, res) {
  const invoice = await invoiceService.createInvoice(req.body);
  res.status(201).json({ invoice });
}

async function list(req, res) {
  const invoices = await invoiceService.listInvoices(req.query);
  res.status(200).json({ invoices });
}

async function getOne(req, res) {
  const invoice = await invoiceService.getInvoice(req.params.id);
  res.status(200).json({ invoice });
}

async function update(req, res) {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
  res.status(200).json({ invoice });
}

async function remove(req, res) {
  await invoiceService.deleteInvoice(req.params.id);
  res.status(204).send();
}

async function upload(req, res) {
  if (!req.file) {
    throw new AppError('No file uploaded. Attach a file under the "file" field.', 400);
  }
  const summary = await invoiceService.uploadInvoicesFile(req.file);
  res.status(201).json(summary);
}

module.exports = { create, list, getOne, update, remove, upload };
