const {
  amountsEqual,
  matchByInvoiceNumber,
  matchByFuzzySearch,
} = require('../../src/modules/reconciliation/matching.engine');

describe('amountsEqual', () => {
  test('treats exactly equal numbers as equal', () => {
    expect(amountsEqual(100, 100)).toBe(true);
  });

  test('treats tiny floating-point differences as equal', () => {
    expect(amountsEqual(0.1 + 0.2, 0.3)).toBe(true);
  });

  test('treats genuinely different amounts as not equal', () => {
    expect(amountsEqual(100, 100.5)).toBe(false);
  });
});

describe('matchByInvoiceNumber', () => {
  test('full payment confirms immediately', () => {
    const payment = { amount: 2000 };
    const invoice = { id: 4, amount: 2000, amount_matched: 0 };

    const result = matchByInvoiceNumber(payment, invoice);

    expect(result).toEqual({
      invoiceId: 4,
      matchType: 'exact',
      status: 'confirmed',
      matchedAmount: 2000,
      score: 100,
    });
  });

  test('underpayment confirms for whatever was actually paid', () => {
    const payment = { amount: 1000 };
    const invoice = { id: 5, amount: 3000, amount_matched: 0 };

    const result = matchByInvoiceNumber(payment, invoice);

    expect(result.status).toBe('confirmed');
    expect(result.matchedAmount).toBe(1000);
  });

  test('a second partial payment is measured against what is still outstanding', () => {
    // invoice already has 1000 applied from an earlier payment, so only
    // 2000 is actually still owed
    const payment = { amount: 2000 };
    const invoice = { id: 5, amount: 3000, amount_matched: 1000 };

    const result = matchByInvoiceNumber(payment, invoice);

    expect(result.status).toBe('confirmed');
    expect(result.matchedAmount).toBe(2000);
  });

  test('overpayment needs review instead of auto-confirming', () => {
    const payment = { amount: 1600 };
    const invoice = { id: 6, amount: 1500, amount_matched: 0 };

    const result = matchByInvoiceNumber(payment, invoice);

    expect(result.status).toBe('needs_review');
    expect(result.matchedAmount).toBe(1500); // only what's actually owed
  });

  test('a payment against an already fully-paid invoice proposes applying nothing', () => {
    const payment = { amount: 500 };
    const invoice = { id: 7, amount: 1000, amount_matched: 1000 };

    const result = matchByInvoiceNumber(payment, invoice);

    expect(result.status).toBe('needs_review');
    expect(result.matchedAmount).toBe(0);
  });
});

describe('matchByFuzzySearch', () => {
  test('returns null when the payment has no payer name to compare', () => {
    const payment = { amount: 750, payer_name: '' };
    const candidates = [{ id: 7, amount: 750, amount_matched: 0, customer_name: 'Epsilon Corp' }];

    expect(matchByFuzzySearch(payment, candidates)).toBeNull();
  });

  test('returns null when no candidate has a matching outstanding amount', () => {
    const payment = { amount: 750, payer_name: 'Epsilon Corp' };
    const candidates = [{ id: 5, amount: 3000, amount_matched: 1000, customer_name: 'Epsilon Corp' }];

    expect(matchByFuzzySearch(payment, candidates)).toBeNull();
  });

  test('finds a close name match once the amount lines up', () => {
    const payment = { amount: 750, payer_name: 'Epsilon Corp Pvt Ltd' };
    const candidates = [{ id: 7, amount: 750, amount_matched: 0, customer_name: 'Epsilon Corp' }];

    const result = matchByFuzzySearch(payment, candidates);

    expect(result.matchType).toBe('fuzzy');
    expect(result.status).toBe('needs_review');
    expect(result.invoiceId).toBe(7);
    expect(result.score).toBeGreaterThan(60);
  });

  test('returns null when the best name match is still too weak', () => {
    const payment = { amount: 750, payer_name: 'Totally Unrelated Name' };
    const candidates = [{ id: 7, amount: 750, amount_matched: 0, customer_name: 'Epsilon Corp' }];

    expect(matchByFuzzySearch(payment, candidates)).toBeNull();
  });

  test('refuses to guess when two candidates are too close to call', () => {
    // verified with compareTwoStrings directly: 0.923 vs 0.88 - only 0.043
    // apart, well inside the 0.15 tie margin
    const payment = { amount: 750, payer_name: 'Sharma Traders' };
    const candidates = [
      { id: 1, amount: 750, amount_matched: 0, customer_name: 'Sharma Traders Co' },
      { id: 2, amount: 750, amount_matched: 0, customer_name: 'Sharma Trader Co' },
    ];

    expect(matchByFuzzySearch(payment, candidates)).toBeNull();
  });

  test('picks the clearly best candidate when one stands out', () => {
    const payment = { amount: 750, payer_name: 'Epsilon Corp' };
    const candidates = [
      { id: 1, amount: 750, amount_matched: 0, customer_name: 'Epsilon Corp' },
      { id: 2, amount: 750, amount_matched: 0, customer_name: 'Totally Different Traders' },
    ];

    const result = matchByFuzzySearch(payment, candidates);

    expect(result.invoiceId).toBe(1);
  });
});
