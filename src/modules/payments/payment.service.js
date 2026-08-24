const paymentRepository = require('./payment.repository');
const { parseFile } = require('./payment.parser');
const { paymentRowSchema } = require('./payment.validation');
const AppError = require('../../utils/AppError');

function toPaymentResponse(payment) {
  return {
    id: payment.id,
    transactionId: payment.transaction_id,
    referenceNumber: payment.reference_number,
    payerName: payment.payer_name,
    amount: payment.amount,
    amountMatched: payment.amount_matched,
    currency: payment.currency,
    paymentDate: payment.payment_date,
    description: payment.description,
    status: payment.status,
    createdAt: payment.created_at,
  };
}

async function uploadFile(file) {
  const rawRows = parseFile(file.buffer, file.originalname);

  const validRows = [];
  const invalidRows = [];

  rawRows.forEach((row, index) => {
    const { error, value } = paymentRowSchema.validate(row, { abortEarly: false });
    if (error) {
      invalidRows.push({
        row: index + 2, // +1 for 0-based index, +1 for the header row
        reason: error.details.map((detail) => detail.message).join(', '),
      });
      return;
    }
    validRows.push({ ...value, raw_row: row });
  });

  const insertedTransactionIds = await paymentRepository.bulkInsert(validRows);
  const insertedSet = new Set(insertedTransactionIds);

  const duplicateRows = validRows
    .filter((row) => !insertedSet.has(row.transaction_id))
    .map((row) => ({
      transaction_id: row.transaction_id,
      reason: 'Duplicate transaction_id, already imported',
    }));

  return {
    totalRows: rawRows.length,
    insertedRows: insertedTransactionIds.length,
    duplicateRows,
    invalidRows,
  };
}

async function listPayments(filters) {
  const payments = await paymentRepository.list(filters);
  return payments.map(toPaymentResponse);
}

async function getPayment(id) {
  const payment = await paymentRepository.findById(id);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  return toPaymentResponse(payment);
}

module.exports = { uploadFile, listPayments, getPayment };
