const { compareTwoStrings } = require('../../utils/stringSimilarity');

const FUZZY_NAME_THRESHOLD = 0.6;
const FUZZY_TIE_MARGIN = 0.15;

// Money comparisons should never use === directly - rounding on the way in
// or out of the database can leave a tiny difference like 99.999999.
function amountsEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.005;
}

// Decides what to do when a payment's reference number pointed us straight
// at a specific invoice. We compare against what's still OWED on that
// invoice (amount - amount_matched), not the original invoice amount, so
// this also works correctly for an invoice that's already been partially
// paid by an earlier payment.
function matchByInvoiceNumber(payment, invoice) {
  const outstanding = Number(invoice.amount) - Number(invoice.amount_matched);
  const paymentAmount = Number(payment.amount);

  const isOverpaying = paymentAmount > outstanding && !amountsEqual(paymentAmount, outstanding);

  if (!isOverpaying) {
    return {
      invoiceId: invoice.id,
      matchType: 'exact',
      status: 'confirmed',
      matchedAmount: paymentAmount,
      score: 100,
    };
  }

  // Pays more than what's actually still owed - could be a genuine
  // overpayment, or the invoice was already settled by something else.
  // Either way, a human should decide what happens to the extra money.
  return {
    invoiceId: invoice.id,
    matchType: 'exact',
    status: 'needs_review',
    matchedAmount: outstanding > 0 ? outstanding : 0,
    score: 100,
  };
}

// Fallback for when no invoice number pointed us anywhere. Only considers
// invoices whose outstanding balance exactly matches the payment amount,
// then picks whichever candidate's customer name reads closest to the
// payment's payer name. Never auto-confirms - a guess always needs a human.
function matchByFuzzySearch(payment, candidateInvoices) {
  const paymentAmount = Number(payment.amount);
  const payerName = (payment.payer_name || '').trim();
  if (!payerName) return null;

  const scored = candidateInvoices
    .map((invoice) => {
      const outstanding = Number(invoice.amount) - Number(invoice.amount_matched);
      if (!amountsEqual(paymentAmount, outstanding)) return null;

      const customerName = (invoice.customer_name || '').trim();
      if (!customerName) return null;

      return { invoice, score: compareTwoStrings(payerName, customerName) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const [best, second] = scored;
  if (best.score < FUZZY_NAME_THRESHOLD) return null;
  if (second && best.score - second.score < FUZZY_TIE_MARGIN) return null;

  return {
    invoiceId: best.invoice.id,
    matchType: 'fuzzy',
    status: 'needs_review',
    matchedAmount: paymentAmount,
    score: Math.round(best.score * 100),
  };
}

module.exports = { amountsEqual, matchByInvoiceNumber, matchByFuzzySearch };
