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

module.exports = { createInvoiceSchema, updateInvoiceSchema };
