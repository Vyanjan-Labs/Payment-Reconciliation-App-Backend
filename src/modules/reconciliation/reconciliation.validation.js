const Joi = require('joi');

const reviewMatchSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'rejected').required(),
  notes: Joi.string().allow('', null),
});

const createManualMatchSchema = Joi.object({
  invoiceId: Joi.number().integer().positive().required(),
  paymentId: Joi.number().integer().positive().required(),
  matchedAmount: Joi.number().positive().precision(2).required(),
  notes: Joi.string().allow('', null),
});

module.exports = { reviewMatchSchema, createManualMatchSchema };
