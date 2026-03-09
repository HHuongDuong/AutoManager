module.exports = function createAiService() {
  function forecast(payload) {
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = payload;
    const w = Math.max(1, Number(window || 7));
    const n = Math.max(1, Number(horizon || 7));
    const working = Array.isArray(series) ? [...series] : [];
    const forecastData = [];

    if (method === 'moving_average') {
      for (let i = 0; i < n; i++) {
        const slice = working.slice(Math.max(0, working.length - w));
        const avg = slice.reduce((s, v) => s + Number(v || 0), 0) / slice.length;
        forecastData.push(Number(avg.toFixed(2)));
        working.push(avg);
      }
      return { method, horizon: n, window: w, forecast: forecastData };
    }

    return { error: 'unsupported_method' };
  }

  function suggestReorder(payload) {
    const { branch_id, items = [] } = payload;
    const suggestions = items.map(i => {
      const avg = (Array.isArray(i.series) && i.series.length)
        ? i.series.reduce((s, v) => s + Number(v || 0), 0) / i.series.length
        : 0;
      const target = avg * 7;
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
    return { branch_id, suggestions };
  }

  return {
    forecast,
    suggestReorder
  };
};
