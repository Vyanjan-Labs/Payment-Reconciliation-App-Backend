const reportRepository = require('./report.repository');

const INVOICE_STATUS_KEYS = {
  unmatched: 'unmatched',
  partially_matched: 'partiallyMatched',
  matched: 'matched',
  overpaid: 'overpaid',
};

const MATCH_STATUS_KEYS = {
  confirmed: 'confirmed',
  needs_review: 'needsReview',
  rejected: 'rejected',
};

// Turns rows like [{status: 'unmatched', count: '2'}] into a plain object
// with every known key present (0 if that status has no rows yet), so the
// API response shape never changes just because a status happens to be empty.
function countsToObject(rows, statusKeys) {
  const counts = Object.fromEntries(Object.values(statusKeys).map((key) => [key, 0]));
  for (const row of rows) {
    const key = statusKeys[row.status];
    if (key) counts[key] = Number(row.count);
  }
  return counts;
}

async function getSummary() {
  const [invoiceCountRows, amountTotals, matchCountRows] = await Promise.all([
    reportRepository.getInvoiceCounts(),
    reportRepository.getInvoiceAmountTotals(),
    reportRepository.getMatchCounts(),
  ]);

  const invoicesByStatus = countsToObject(invoiceCountRows, INVOICE_STATUS_KEYS);
  const totalInvoices = Object.values(invoicesByStatus).reduce((sum, count) => sum + count, 0);

  return {
    invoices: { total: totalInvoices, ...invoicesByStatus },
    amounts: {
      totalInvoiced: Number(amountTotals.total_invoiced),
      totalCollected: Number(amountTotals.total_collected),
      totalOutstanding: Number(amountTotals.total_outstanding),
    },
    matches: countsToObject(matchCountRows, MATCH_STATUS_KEYS),
  };
}

module.exports = { getSummary };
