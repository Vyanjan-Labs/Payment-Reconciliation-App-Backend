const invoiceRepository = require('./invoice.repository');
const AppError = require('../../utils/AppError');

// The database uses snake_case columns; the API responds in camelCase.
// Keeping that translation here means the rest of the app never sees snake_case.
function toInvoiceResponse(invoice) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    customerName: invoice.customer_name,
    amount: invoice.amount,
    amountMatched: invoice.amount_matched,
    currency: invoice.currency,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
  };
}

async function createInvoice(data) {
  const invoice = await invoiceRepository.create(data);
  return toInvoiceResponse(invoice);
}

async function listInvoices(filters) {
  const invoices = await invoiceRepository.list(filters);
  return invoices.map(toInvoiceResponse);
}

async function getInvoice(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }
  return toInvoiceResponse(invoice);
}

async function updateInvoice(id, data) {
  await getInvoice(id);
  const invoice = await invoiceRepository.update(id, data);
  return toInvoiceResponse(invoice);
}

async function deleteInvoice(id) {
  await getInvoice(id);

  const hasConfirmed = await invoiceRepository.hasConfirmedMatches(id);
  if (hasConfirmed) {
    throw new AppError('Cannot delete an invoice with confirmed matches', 409);
  }

  await invoiceRepository.remove(id);
}

module.exports = { createInvoice, listInvoices, getInvoice, updateInvoice, deleteInvoice };
