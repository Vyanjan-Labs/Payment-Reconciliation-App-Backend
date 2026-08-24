const reconciliationService = require('./reconciliation.service');

async function run(req, res) {
  const summary = await reconciliationService.runReconciliation();
  res.status(200).json(summary);
}

async function list(req, res) {
  const matches = await reconciliationService.listMatches(req.query);
  res.status(200).json({ matches });
}

async function getOne(req, res) {
  const match = await reconciliationService.getMatch(req.params.id);
  res.status(200).json({ match });
}

async function review(req, res) {
  const match = await reconciliationService.reviewMatch(req.params.id, req.body);
  res.status(200).json({ match });
}

async function createManual(req, res) {
  const match = await reconciliationService.createManualMatch(req.body);
  res.status(201).json({ match });
}

async function remove(req, res) {
  await reconciliationService.undoMatch(req.params.id);
  res.status(204).send();
}

async function candidates(req, res) {
  const results = await reconciliationService.getCandidates(req.query.paymentId);
  res.status(200).json({ candidates: results });
}

module.exports = { run, list, getOne, review, createManual, remove, candidates };
