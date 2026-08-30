const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const resetDb = require('../helpers/resetDb');
const { signupAndLogin } = require('../helpers/authHelper');

let token;

beforeEach(async () => {
  await resetDb();
  ({ token } = await signupAndLogin(app));
});

afterAll(async () => {
  await pool.end();
});

function authed(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

async function createInvoice(overrides = {}) {
  const response = await authed(request(app).post('/api/invoices')).send({
    invoiceNumber: overrides.invoiceNumber || 'INV-TEST',
    customerName: overrides.customerName || 'Test Customer',
    amount: overrides.amount ?? 1000,
    invoiceDate: overrides.invoiceDate || '2026-08-01',
  });
  return response.body.invoice;
}

async function uploadPayment(overrides = {}) {
  const row = [
    overrides.transactionId || 'TXN-TEST',
    overrides.paymentDate || '2026-08-01',
    overrides.amount ?? 1000,
    overrides.referenceNumber ?? '',
    overrides.payerName ?? '',
    '',
  ].join(',');
  const csv = `transaction_id,payment_date,amount,reference_number,payer_name,description\n${row}\n`;

  await authed(request(app).post('/api/payments/upload')).attach('file', Buffer.from(csv), 'p.csv');

  const list = await authed(request(app).get('/api/payments'));
  return list.body.payments.find((p) => p.transactionId === (overrides.transactionId || 'TXN-TEST'));
}

describe('POST /api/reconciliation/run', () => {
  test('confirms an exact full match automatically', async () => {
    const invoice = await createInvoice({ invoiceNumber: 'INV-R1', amount: 1000 });
    await uploadPayment({ transactionId: 'TXN-R1', amount: 1000, referenceNumber: 'INV-R1' });

    const runResponse = await authed(request(app).post('/api/reconciliation/run'));
    expect(runResponse.body.exactMatches).toBe(1);

    const invoiceCheck = await authed(request(app).get(`/api/invoices/${invoice.id}`));
    expect(invoiceCheck.body.invoice.status).toBe('matched');
  });

  test('flags an overpayment for review instead of auto-confirming', async () => {
    await createInvoice({ invoiceNumber: 'INV-R2', amount: 500 });
    await uploadPayment({ transactionId: 'TXN-R2', amount: 600, referenceNumber: 'INV-R2' });

    await authed(request(app).post('/api/reconciliation/run'));

    const matches = await authed(request(app).get('/api/reconciliation/matches?status=needs_review'));
    expect(matches.body.matches).toHaveLength(1);
    expect(matches.body.matches[0].matchedAmount).toBe('500.00');
  });

  test('leaves a payment unmatched when nothing lines up', async () => {
    await uploadPayment({ transactionId: 'TXN-R3', amount: 99999, referenceNumber: 'NO-SUCH-INVOICE' });

    const runResponse = await authed(request(app).post('/api/reconciliation/run'));
    expect(runResponse.body.stillUnmatched).toBe(1);
  });
});

describe('PATCH /api/reconciliation/matches/:id', () => {
  async function createNeedsReviewMatch() {
    await createInvoice({ invoiceNumber: 'INV-R4', amount: 500 });
    await uploadPayment({ transactionId: 'TXN-R4', amount: 600, referenceNumber: 'INV-R4' });
    await authed(request(app).post('/api/reconciliation/run'));
    const matches = await authed(request(app).get('/api/reconciliation/matches?status=needs_review'));
    return matches.body.matches[0];
  }

  test('confirming applies the money to the invoice and payment', async () => {
    const match = await createNeedsReviewMatch();

    const response = await authed(request(app).patch(`/api/reconciliation/matches/${match.id}`)).send({
      status: 'confirmed',
    });

    expect(response.status).toBe(200);
    expect(response.body.match.status).toBe('confirmed');

    const invoiceCheck = await authed(request(app).get(`/api/invoices/${match.invoiceId}`));
    expect(invoiceCheck.body.invoice.status).toBe('matched');
  });

  test('rejecting leaves the invoice unchanged', async () => {
    const match = await createNeedsReviewMatch();

    const response = await authed(request(app).patch(`/api/reconciliation/matches/${match.id}`)).send({
      status: 'rejected',
    });

    expect(response.status).toBe(200);

    const invoiceCheck = await authed(request(app).get(`/api/invoices/${match.invoiceId}`));
    expect(invoiceCheck.body.invoice.status).toBe('unmatched');
  });

  test('cannot review a match that is already confirmed', async () => {
    await createInvoice({ invoiceNumber: 'INV-R5', amount: 1000 });
    await uploadPayment({ transactionId: 'TXN-R5', amount: 1000, referenceNumber: 'INV-R5' });
    await authed(request(app).post('/api/reconciliation/run'));
    const matches = await authed(request(app).get('/api/reconciliation/matches?status=confirmed'));
    const match = matches.body.matches[0];

    const response = await authed(request(app).patch(`/api/reconciliation/matches/${match.id}`)).send({
      status: 'confirmed',
    });

    expect(response.status).toBe(409);
  });
});

describe('POST /api/reconciliation/matches (manual)', () => {
  test('manually matches an invoice and payment, confirmed immediately', async () => {
    const invoice = await createInvoice({ invoiceNumber: 'INV-R6', amount: 300 });
    const payment = await uploadPayment({ transactionId: 'TXN-R6', amount: 300, referenceNumber: '' });

    const response = await authed(request(app).post('/api/reconciliation/matches')).send({
      invoiceId: invoice.id,
      paymentId: payment.id,
      matchedAmount: 300,
    });

    expect(response.status).toBe(201);
    expect(response.body.match.status).toBe('confirmed');
    expect(response.body.match.matchedBy).toBe('manual');
  });
});

describe('DELETE /api/reconciliation/matches/:id', () => {
  test('undoing a confirmed match reverts the invoice and payment', async () => {
    const invoice = await createInvoice({ invoiceNumber: 'INV-R7', amount: 400 });
    await uploadPayment({ transactionId: 'TXN-R7', amount: 400, referenceNumber: 'INV-R7' });
    await authed(request(app).post('/api/reconciliation/run'));
    const matches = await authed(request(app).get('/api/reconciliation/matches?status=confirmed'));
    const match = matches.body.matches[0];

    const deleteResponse = await authed(request(app).delete(`/api/reconciliation/matches/${match.id}`));
    expect(deleteResponse.status).toBe(204);

    const invoiceCheck = await authed(request(app).get(`/api/invoices/${invoice.id}`));
    expect(invoiceCheck.body.invoice.status).toBe('unmatched');
    expect(invoiceCheck.body.invoice.amountMatched).toBe('0.00');
  });
});

describe('GET /api/reconciliation/candidates', () => {
  test('suggests a fuzzy candidate for a payment with no reference number', async () => {
    const invoice = await createInvoice({
      invoiceNumber: 'INV-R8',
      customerName: 'Epsilon Corp',
      amount: 750,
    });
    const payment = await uploadPayment({
      transactionId: 'TXN-R8',
      amount: 750,
      referenceNumber: '',
      payerName: 'Epsilon Corp Pvt Ltd',
    });

    const response = await authed(
      request(app).get(`/api/reconciliation/candidates?paymentId=${payment.id}`)
    );

    expect(response.status).toBe(200);
    expect(response.body.candidates[0].invoiceId).toBe(invoice.id);
  });
});

describe('re-running reconciliation after an overpayment is confirmed', () => {
  test('does not crash on a payment left partially_matched with an existing match', async () => {
    await createInvoice({ invoiceNumber: 'INV-R9', amount: 500 });
    await uploadPayment({ transactionId: 'TXN-R9', amount: 600, referenceNumber: 'INV-R9' });

    const firstRun = await authed(request(app).post('/api/reconciliation/run'));
    expect(firstRun.status).toBe(200);

    // confirming applies only the invoice's outstanding amount (500 of the
    // 600 paid), leaving the payment stuck at partially_matched with a
    // match row that already occupies this exact (invoice, payment) pair
    const needsReview = await authed(request(app).get('/api/reconciliation/matches?status=needs_review'));
    const match = needsReview.body.matches[0];
    await authed(request(app).patch(`/api/reconciliation/matches/${match.id}`)).send({
      status: 'confirmed',
    });

    // this used to crash with a 409 - the payment stayed eligible for
    // reprocessing and the engine tried to insert a duplicate match row
    const secondRun = await authed(request(app).post('/api/reconciliation/run'));

    expect(secondRun.status).toBe(200);
    expect(secondRun.body.exactMatches).toBe(0);
    expect(secondRun.body.fuzzyMatchesNeedingReview).toBe(0);
  });
});
