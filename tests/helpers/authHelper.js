const request = require('supertest');

// Signs up a fresh test user and logs in, returning the token most
// protected-route tests need. Safe to call once per test as long as
// resetDb() ran first (via beforeEach), since it always starts from an
// empty users table.
async function signupAndLogin(app, overrides = {}) {
  const payload = {
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    email: overrides.email || 'testuser@example.com',
    password: overrides.password || 'testpassword123',
  };

  await request(app).post('/api/auth/signup').send(payload);
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password });

  return { token: loginResponse.body.token, user: loginResponse.body.user };
}

module.exports = { signupAndLogin };
