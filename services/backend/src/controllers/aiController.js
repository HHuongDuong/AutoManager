const createAiService = require('../services/aiService');

module.exports = function createAiController(deps) {
  const { writeAuditLog } = deps;
  const aiService = createAiService(deps);

  async function forecast(req, res) {
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = req.body || {};
    console.log('[ai] forecast request', { horizon, method, window, series_len: Array.isArray(series) ? series.length : 0 });
    if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'series_required' });
    const result = await aiService.forecast({ series, horizon, method, window });
    if (result?.error === 'unsupported_method') return res.status(400).json({ error: 'unsupported_method' });
    if (result?.error === 'ai_not_configured') return res.status(503).json({ error: 'ai_not_configured' });
    if (result?.error === 'ai_invalid_response') return res.status(502).json({ error: 'ai_invalid_response' });
    if (result?.error === 'ai_provider_error') return res.status(502).json({ error: 'ai_provider_error', status: result.status || null });
    console.log('[ai] forecast response', { horizon: result.horizon, window: result.window, forecast_len: result.forecast?.length || 0 });
    await writeAuditLog(req, 'AI_FORECAST', 'ai', null, { method, horizon: result.horizon, window: result.window });
    return res.json(result);
  }

  async function suggestReorder(req, res) {
    const { branch_id, items = [] } = req.body || {};
    console.log('[ai] suggest-reorder request', { branch_id, items_len: Array.isArray(items) ? items.length : 0 });
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });
    const result = await aiService.suggestReorder({ branch_id, items });
    if (result?.error === 'ai_not_configured') return res.status(503).json({ error: 'ai_not_configured' });
    if (result?.error === 'ai_invalid_response') return res.status(502).json({ error: 'ai_invalid_response' });
    if (result?.error === 'ai_provider_error') return res.status(502).json({ error: 'ai_provider_error', status: result.status || null });
    console.log('[ai] suggest-reorder response', { branch_id, count: result.suggestions?.length || 0 });
    await writeAuditLog(req, 'AI_REORDER_SUGGEST', 'ai', null, { branch_id, count: result.suggestions.length });
    return res.json(result);
  }

  return {
    forecast,
    suggestReorder
  };
};
