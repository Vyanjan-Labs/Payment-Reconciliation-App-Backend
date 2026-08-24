const reconciliationRepository = require('./reconciliation.repository');
const invoiceRepository = require('../invoices/invoice.repository');
const paymentRepository = require('../payments/payment.repository');
const { matchByInvoiceNumber, matchByFuzzySearch, amountsEqual } = require('./matching.engine');
const { compareTwoStrings } = require('../../utils/stringSimilarity');
const withTransaction = require('../../utils/withTransaction');
const AppError = require('../../utils/AppError');

function toMatchResponse(match) {
  return {
    id: match.id,
    invoiceId: match.invoice_id,
    paymentId: match.payment_id,
    matchType: match.match_type,
    matchScore: match.match_score,
    matchedAmount: match.matched_amount,
    status: match.status,
    matchedBy: match.matched_by,
    notes: match.notes,
    createdAt: match.created_at,
    updatedAt: match.updated_at,
  };
}

async function runReconciliation() {
  const payments = await reconciliationRepository.getUnmatchedPayments();

  const summary = {
    totalPayments: payments.length,
    exactMatches: 0,
    fuzzyMatchesNeedingReview: 0,
    stillUnmatched: 0,
  };

  for (const payment of payments) {
    const invoice = await reconciliationRepository.findInvoiceByReferenceNumber(
      payment.reference_number
    );

    const decision = invoice
      ? matchByInvoiceNumber(payment, invoice)
      : matchByFuzzySearch(
          payment,
          await reconciliationRepository.findFuzzyCandidates(payment.amount, payment.payment_date)
        );

    if (!decision) {
      summary.stillUnmatched++;
      continue;
    }

    await withTransaction((client) =>
      reconciliationRepository.recordMatch(client, {
        paymentId: payment.id,
        invoiceId: decision.invoiceId,
        matchType: decision.matchType,
        status: decision.status,
        matchedAmount: decision.matchedAmount,
        score: decision.score,
      })
    );

    if (decision.matchType === 'exact') {
      summary.exactMatches++;
    } else {
      summary.fuzzyMatchesNeedingReview++;
    }
  }

  return summary;
}

async function listMatches(filters) {
  const matches = await reconciliationRepository.listMatches(filters);
  return matches.map(toMatchResponse);
}

async function getMatch(id) {
  const match = await reconciliationRepository.findMatchById(id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }
  return toMatchResponse(match);
}

// A person confirming or rejecting something the automatic run flagged.
// Only needs_review matches can go through this - a match that's already
// confirmed or rejected shouldn't be silently changed again.
async function reviewMatch(id, { status, notes }) {
  const match = await reconciliationRepository.findMatchById(id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }
  if (match.status !== 'needs_review') {
    throw new AppError(
      `Only matches with status 'needs_review' can be confirmed or rejected (this one is '${match.status}')`,
      409
    );
  }

  const updated = await withTransaction(async (client) => {
    const updatedMatch = await reconciliationRepository.updateMatchStatus(client, id, { status, notes });
    if (status === 'confirmed') {
      await reconciliationRepository.applyConfirmedAmount(client, {
        invoiceId: match.invoice_id,
        paymentId: match.payment_id,
        matchedAmount: match.matched_amount,
      });
    }
    return updatedMatch;
  });

  return toMatchResponse(updated);
}

// A human manually pairing a payment with an invoice the engine didn't
// find on its own. Confirmed immediately - a person is vouching for it.
async function createManualMatch({ invoiceId, paymentId, matchedAmount, notes }) {
  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  const paymentRemaining = Number(payment.amount) - Number(payment.amount_matched);
  if (matchedAmount > paymentRemaining && !amountsEqual(matchedAmount, paymentRemaining)) {
    throw new AppError(
      `matchedAmount (${matchedAmount}) exceeds what's left on this payment (${paymentRemaining})`,
      400
    );
  }

  // The UNIQUE constraint on (invoice_id, payment_id) blocks a second row for
  // the same pair regardless of the existing row's status - so a previously
  // rejected match has to be turned into the new one, not inserted alongside it.
  const existing = await reconciliationRepository.findMatchByPair(invoiceId, paymentId);
  if (existing && existing.status !== 'rejected') {
    throw new AppError('This invoice and payment are already matched to each other', 409);
  }

  const result = await withTransaction(async (client) => {
    const match = existing
      ? await reconciliationRepository.overwriteAsManualMatch(client, existing.id, { matchedAmount, notes })
      : await reconciliationRepository.recordMatch(client, {
          paymentId,
          invoiceId,
          matchType: 'manual',
          status: 'confirmed',
          matchedAmount,
          score: null,
          matchedBy: 'manual',
          notes,
        });

    if (existing) {
      // recordMatch applies the amount internally for a brand-new confirmed
      // match, but overwriteAsManualMatch is a plain UPDATE - so a resurrected
      // match needs that step done explicitly here.
      await reconciliationRepository.applyConfirmedAmount(client, { invoiceId, paymentId, matchedAmount });
    }

    return match;
  });

  return toMatchResponse(result);
}

// Undoing a mistake. If the match had actually applied money (status was
// confirmed), that gets reversed first - otherwise nothing was ever applied,
// so deleting the row is the whole job.
async function undoMatch(id) {
  const match = await reconciliationRepository.findMatchById(id);
  if (!match) {
    throw new AppError('Match not found', 404);
  }

  await withTransaction(async (client) => {
    if (match.status === 'confirmed') {
      await reconciliationRepository.revertAppliedAmount(client, {
        invoiceId: match.invoice_id,
        paymentId: match.payment_id,
        matchedAmount: match.matched_amount,
      });
    }
    await reconciliationRepository.deleteMatchRow(client, id);
  });
}

// Shows a person the best few guesses for one payment, without committing
// to anything - unlike the automatic engine, this doesn't apply a threshold
// or refuse on a near-tie; a human is doing the filtering here, not the code.
async function getCandidates(paymentId) {
  const payment = await paymentRepository.findById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  const candidateInvoices = await reconciliationRepository.findFuzzyCandidates(
    payment.amount,
    payment.payment_date
  );
  const payerName = (payment.payer_name || '').trim();
  const paymentAmount = Number(payment.amount);

  return candidateInvoices
    .filter((invoice) =>
      amountsEqual(paymentAmount, Number(invoice.amount) - Number(invoice.amount_matched))
    )
    .map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      outstanding: Number(invoice.amount) - Number(invoice.amount_matched),
      score: payerName ? Math.round(compareTwoStrings(payerName, invoice.customer_name || '') * 100) : null,
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
}

module.exports = {
  runReconciliation,
  listMatches,
  getMatch,
  reviewMatch,
  createManualMatch,
  undoMatch,
  getCandidates,
};
