const Joi = require('joi');

const paymentRowSchema = Joi.object({
  transaction_id: Joi.string().max(100).required(),
  payment_date: Joi.date().iso().required(),
  amount: Joi.number().positive().precision(2).required(),
  reference_number: Joi.string().max(100).empty('').allow(null),
  payer_name: Joi.string().max(255).empty('').allow(null),
  description: Joi.string().empty('').allow(null),
});

module.exports = { paymentRowSchema };
