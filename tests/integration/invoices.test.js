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

describe('invoice routes require login', () => {
  test('rejects requests with no token', async () => {
    const response = await request(app).get('/api/invoices');
    expect(response.status).toBe(401);
  });
});

describe('POST /api/invoices', () => {
  test('creates an invoice', async () => {
    const response = await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-9001',
      customerName: 'Test Customer',
      amount: 1000,
      invoiceDate: '2026-08-01',
    });

    expect(response.status).toBe(201);
    expect(response.body.invoice).toMatchObject({
      invoiceNumber: 'INV-9001',
      customerName: 'Test Customer',
      status: 'unmatched',
    });
  });

  test('rejects a duplicate invoice number', async () => {
    const payload = {
      invoiceNumber: 'INV-9002',
      customerName: 'Test Customer',
      amount: 500,
      invoiceDate: '2026-08-01',
    };
    await authed(request(app).post('/api/invoices')).send(payload);

    const response = await authed(request(app).post('/api/invoices')).send(payload);

    expect(response.status).toBe(409);
  });

  test('rejects a request missing required fields', async () => {
    const response = await authed(request(app).post('/api/invoices')).send({ amount: 100 });
    expect(response.status).toBe(400);
  });
});

describe('GET /api/invoices', () => {
  test('lists invoices and supports filtering by status', async () => {
    await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-9101',
      customerName: 'A',
      amount: 100,
      invoiceDate: '2026-08-01',
    });
    await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-9102',
      customerName: 'B',
      amount: 200,
      invoiceDate: '2026-08-02',
    });

    const all = await authed(request(app).get('/api/invoices'));
    expect(all.body.invoices).toHaveLength(2);

    const filtered = await authed(request(app).get('/api/invoices?status=unmatched'));
    expect(filtered.body.invoices).toHaveLength(2);

    const noneMatched = await authed(request(app).get('/api/invoices?status=matched'));
    expect(noneMatched.body.invoices).toHaveLength(0);
  });
});

describe('GET /api/invoices/:id', () => {
  test('returns 404 for an invoice that does not exist', async () => {
    const response = await authed(request(app).get('/api/invoices/999999'));
    expect(response.status).toBe(404);
  });
});

describe('PUT /api/invoices/:id', () => {
  test('updates only the fields provided', async () => {
    const created = await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-9201',
      customerName: 'Original Name',
      amount: 100,
      invoiceDate: '2026-08-01',
    });
    const id = created.body.invoice.id;

    const updated = await authed(request(app).put(`/api/invoices/${id}`)).send({ amount: 250 });

    expect(updated.status).toBe(200);
    expect(updated.body.invoice.amount).toBe('250.00');
    expect(updated.body.invoice.customerName).toBe('Original Name');
  });
});

describe('DELETE /api/invoices/:id', () => {
  test('deletes an invoice with no matches', async () => {
    const created = await authed(request(app).post('/api/invoices')).send({
      invoiceNumber: 'INV-9301',
      customerName: 'Delete Me',
      amount: 100,
      invoiceDate: '2026-08-01',
    });
    const id = created.body.invoice.id;

    const deleteResponse = await authed(request(app).delete(`/api/invoices/${id}`));
    expect(deleteResponse.status).toBe(204);

    const getResponse = await authed(request(app).get(`/api/invoices/${id}`));
    expect(getResponse.status).toBe(404);
  });
});

describe('POST /api/invoices/upload', () => {
  const csv =
    'invoice_number,customer_name,amount,invoice_date,due_date\n' +
    'INV-9401,Upload Co,500.00,2026-08-01,2026-08-31\n' +
    'INV-9402,Another Co,not-a-number,2026-08-02,\n';

  test('inserts valid rows and reports invalid ones', async () => {
    const response = await authed(request(app).post('/api/invoices/upload')).attach(
      'file',
      Buffer.from(csv),
      'invoices.csv'
    );

    expect(response.status).toBe(201);
    expect(response.body.totalRows).toBe(2);
    expect(response.body.insertedRows).toBe(1);
    expect(response.body.invalidRows).toHaveLength(1);
  });

  test('skips already-uploaded invoice numbers on a second upload', async () => {
    await authed(request(app).post('/api/invoices/upload')).attach('file', Buffer.from(csv), 'invoices.csv');

    const response = await authed(request(app).post('/api/invoices/upload')).attach(
      'file',
      Buffer.from(csv),
      'invoices.csv'
    );

    expect(response.body.insertedRows).toBe(0);
    expect(response.body.duplicateRows).toHaveLength(1);
  });
});
