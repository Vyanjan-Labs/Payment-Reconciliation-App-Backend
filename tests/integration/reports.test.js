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

describe('GET /api/reports/summary', () => {
  test('rejects requests with no token', async () => {
    const response = await request(app).get('/api/reports/summary');
    expect(response.status).toBe(401);
  });

  test('returns zeroed-out totals when nothing exists yet', async () => {
    const response = await authed(request(app).get('/api/reports/summary'));

    expect(response.status).toBe(200);
    expect(response.body.invoices.total).toBe(0);
    expect(response.body.amounts.totalOutstanding).toBe(0);
  });

  test('reflects a confirmed match in the totals', async () => {
    await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-REPORT-1',
      customerName: 'Report Co',
      amount: 1000,
      invoiceDate: '2026-08-01',
    });

    const csv =
      'transaction_id,payment_date,amount,reference_number,payer_name,description\n' +
      'TXN-REPORT-1,2026-08-01,1000.00,INV-REPORT-1,Report Co,\n';
    await authed(request(app).post('/api/payments/upload')).attach('file', Buffer.from(csv), 'p.csv');

    await authed(request(app).post('/api/reconciliation/run'));

    const response = await authed(request(app).get('/api/reports/summary'));

    expect(response.body.invoices.matched).toBe(1);
    expect(response.body.amounts.totalCollected).toBe(1000);
    expect(response.body.amounts.totalOutstanding).toBe(0);
    expect(response.body.matches.confirmed).toBe(1);
  });
});
