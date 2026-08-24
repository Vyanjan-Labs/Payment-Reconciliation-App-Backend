const invoiceService = require('./invoice.service');

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

module.exports = { create, list, getOne, update, remove };
