const express = require('express');

module.exports = function createAiRouter(deps) {
  const {
    authenticate,
    requirePermission,
    requireBranchBody,
    writeAuditLog
  } = deps;

  const router = express.Router();

  router.post('/ai/forecast', authenticate, requirePermission('AI_USE'), async (req, res) => {
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = req.body || {};
    if (!Array.isArray(series) || series.length === 0) return res.status(400).json({ error: 'series_required' });
    const w = Math.max(1, Number(window || 7));
    const n = Math.max(1, Number(horizon || 7));
    let forecast = [];
    if (method === 'moving_average') {
      for (let i = 0; i < n; i++) {
        const slice = series.slice(Math.max(0, series.length - w));
        const avg = slice.reduce((s, v) => s + Number(v || 0), 0) / slice.length;
        forecast.push(Number(avg.toFixed(2)));
        series.push(avg);
      }
    } else {
      return res.status(400).json({ error: 'unsupported_method' });
    }
    await writeAuditLog(req, 'AI_FORECAST', 'ai', null, { method, horizon: n, window: w });
    return res.json({ method, horizon: n, window: w, forecast });
  });

  router.post('/ai/suggest-reorder', authenticate, requirePermission('AI_USE'), requireBranchBody({ bodyKey: 'branch_id' }), async (req, res) => {
    const { branch_id, items = [] } = req.body || {};
    if (!branch_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'branch_items_required' });

    const suggestions = items.map(i => {
      const avg = (Array.isArray(i.series) && i.series.length)
        ? i.series.reduce((s, v) => s + Number(v || 0), 0) / i.series.length
        : 0;
      const target = avg * 7; // next 7 days
      const on_hand = Number(i.on_hand || 0);
      const reorder_qty = Math.max(0, Math.round(target - on_hand));
      return {
        ingredient_id: i.ingredient_id,
        on_hand,
        avg_daily: Number(avg.toFixed(2)),
        horizon_days: 7,
        target_stock: Number(target.toFixed(2)),
        reorder_qty
      };
    });

    await writeAuditLog(req, 'AI_REORDER_SUGGEST', 'ai', null, { branch_id, count: suggestions.length });
    return res.json({ branch_id, suggestions });
  });

  return router;
};
