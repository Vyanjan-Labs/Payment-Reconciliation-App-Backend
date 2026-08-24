const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const resetDb = require('../helpers/resetDb');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/signup', () => {
  test('creates a new user and never returns the password hash', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'testpassword123',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.password).toBeUndefined();
  });

  test('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/signup').send({
      firstName: 'A',
      lastName: 'B',
      email: 'dupe@example.com',
      password: 'testpassword123',
    });

    const response = await request(app).post('/api/auth/signup').send({
      firstName: 'C',
      lastName: 'D',
      email: 'dupe@example.com',
      password: 'anotherpassword',
    });

    expect(response.status).toBe(409);
  });

  test('rejects a request missing required fields', async () => {
    const response = await request(app).post('/api/auth/signup').send({ email: 'bad' });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send({
      firstName: 'Login',
      lastName: 'Test',
      email: 'login@example.com',
      password: 'testpassword123',
    });
  });

  test('logs in with correct credentials and returns a token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'testpassword123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('rejects a wrong password with a generic message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('rejects an unknown email with the SAME generic message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  async function signupAndLogin() {
    await request(app).post('/api/auth/signup').send({
      firstName: 'Me',
      lastName: 'Test',
      email: 'me@example.com',
      password: 'testpassword123',
    });
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'me@example.com', password: 'testpassword123' });
    return loginResponse.body.token;
  }

  test('rejects a request with no token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  test('returns the logged-in user with a valid token', async () => {
    const token = await signupAndLogin();

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('me@example.com');
  });

  test('rejects a tampered token', async () => {
    const token = await signupAndLogin();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}tampered`);

    expect(response.status).toBe(401);
  });
});
