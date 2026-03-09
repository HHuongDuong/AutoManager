const createAiService = require('../services/aiService');

module.exports = function createAiController(deps) {
  const { writeAuditLog } = deps;
  const aiService = createAiService(deps);

  async function forecast(req, res) {
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = req.body || {};
    if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'series_required' });
    const result = aiService.forecast({ series, horizon, method, window });
    if (result?.error === 'unsupported_method') return res.status(400).json({ error: 'unsupported_method' });
    await writeAuditLog(req, 'AI_FORECAST', 'ai', null, { method, horizon: result.horizon, window: result.window });
    return res.json(result);
  }

  async function suggestReorder(req, res) {
    const { branch_id, items = [] } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const result = aiService.suggestReorder({ branch_id, items });
    await writeAuditLog(req, 'AI_REORDER_SUGGEST', 'ai', null, { branch_id, count: result.suggestions.length });
    return res.json(result);
  }

  return {
    forecast,
    suggestReorder
  };
};
