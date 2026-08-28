const Joi = require('joi');

const createInvoiceSchema = Joi.object({
  invoiceNumber: Joi.string().max(100).required(),
  customerName: Joi.string().max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  invoiceDate: Joi.date().iso().required(),
  dueDate: Joi.date().iso().allow(null),
});

const updateInvoiceSchema = Joi.object({
  invoiceNumber: Joi.string().max(100),
  customerName: Joi.string().max(255),
  amount: Joi.number().positive().precision(2),
  invoiceDate: Joi.date().iso(),
  dueDate: Joi.date().iso().allow(null),
}).min(1);

// For bulk CSV/Excel upload - snake_case, matching the documented file
// template directly (same approach as payment.validation.js).
const invoiceRowSchema = Joi.object({
  invoice_number: Joi.string().max(100).required(),
  customer_name: Joi.string().max(255).required(),
  amount: Joi.number().positive().precision(2).required(),
  invoice_date: Joi.date().iso().required(),
  due_date: Joi.date().iso().empty('').allow(null),
});

module.exports = { createInvoiceSchema, updateInvoiceSchema, invoiceRowSchema };
