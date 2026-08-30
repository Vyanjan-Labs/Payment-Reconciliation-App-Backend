const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const pool = require('./config/db');
const env = require('./config/env');
const authRoutes = require('./modules/auth/auth.routes');
const invoiceRoutes = require('./modules/invoices/invoice.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const reconciliationRoutes = require('./modules/reconciliation/reconciliation.routes');
const reportRoutes = require('./modules/reports/report.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
// credentials: true + a specific origin (not '*') is required for the browser
// to accept the httpOnly auth cookie set on login.
app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

module.exports = app;
