const DUPLICATE_MESSAGES = {
  users_email_key: 'That email is already registered',
  invoices_invoice_number_key: 'An invoice with that invoice number already exists',
  payments_transaction_id_key: 'That transaction has already been imported',
  matches_invoice_id_payment_id_key: 'This invoice and payment are already matched to each other',
};

module.exports = (err, req, res, next) => {
  if (err.code === '23505') {
    const message = DUPLICATE_MESSAGES[err.constraint] || 'This already exists';
    return res.status(409).json({ error: message });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
