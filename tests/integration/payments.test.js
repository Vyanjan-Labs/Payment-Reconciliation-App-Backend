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

describe('payment routes require login', () => {
  test('rejects requests with no token', async () => {
    const response = await request(app).get('/api/payments');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/payments/upload', () => {
  const csv =
    'transaction_id,payment_date,amount,reference_number,payer_name,description\n' +
    'TXN-9001,2026-08-01,500.00,INV-1,Test Payer,test payment\n' +
    'TXN-9002,not-a-date,100.00,,Bad Row,broken date\n';

  test('inserts valid rows and reports invalid ones', async () => {
    const response = await authed(request(app).post('/api/payments/upload')).attach(
      'file',
      Buffer.from(csv),
      'payments.csv'
    );

    expect(response.status).toBe(201);
    expect(response.body.totalRows).toBe(2);
    expect(response.body.insertedRows).toBe(1);
    expect(response.body.invalidRows).toHaveLength(1);
  });

  test('skips already-imported transactions on a second upload', async () => {
    await authed(request(app).post('/api/payments/upload')).attach('file', Buffer.from(csv), 'payments.csv');

    const response = await authed(request(app).post('/api/payments/upload')).attach(
      'file',
      Buffer.from(csv),
      'payments.csv'
    );

    expect(response.body.insertedRows).toBe(0);
    expect(response.body.duplicateRows).toHaveLength(1);
  });

  test('rejects a file type that is not csv/xlsx/xls', async () => {
    const response = await authed(request(app).post('/api/payments/upload')).attach(
      'file',
      Buffer.from('not a real spreadsheet'),
      'payments.txt'
    );

    expect(response.status).toBe(400);
  });
});

describe('GET /api/payments', () => {
  test('lists uploaded payments', async () => {
    const csv =
      'transaction_id,payment_date,amount,reference_number,payer_name,description\n' +
      'TXN-9101,2026-08-01,500.00,,Payer,note\n';
    await authed(request(app).post('/api/payments/upload')).attach('file', Buffer.from(csv), 'payments.csv');

    const response = await authed(request(app).get('/api/payments'));

    expect(response.status).toBe(200);
    expect(response.body.payments).toHaveLength(1);
    expect(response.body.payments[0].transactionId).toBe('TXN-9101');
  });
});

describe('GET /api/payments/:id', () => {
  test('returns 404 for a payment that does not exist', async () => {
    const response = await authed(request(app).get('/api/payments/999999'));
    expect(response.status).toBe(404);
  });
});
