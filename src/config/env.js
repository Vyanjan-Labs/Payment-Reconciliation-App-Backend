require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '7d',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3001',
};
