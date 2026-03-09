const express = require('express');
const createAiController = require('../controllers/aiController');

module.exports = function createAiRouter(deps) {
  const {
    authenticate,
    requirePermission,
    requireBranchBody
  } = deps;

  const router = express.Router();
  const controller = createAiController(deps);

  router.post('/ai/forecast', authenticate, requirePermission('AI_USE'), controller.forecast);
  router.post('/ai/suggest-reorder', authenticate, requirePermission('AI_USE'), requireBranchBody({ bodyKey: 'branch_id' }), controller.suggestReorder);

  return router;
};
