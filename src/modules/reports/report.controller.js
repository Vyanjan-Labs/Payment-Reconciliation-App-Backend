const reportService = require('./report.service');

async function summary(req, res) {
  const data = await reportService.getSummary();
  res.status(200).json(data);
}

module.exports = { summary };
