const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

module.exports = function createAiService() {
  function normalizeSeries(series = []) {
    return (Array.isArray(series) ? series : [])
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));
  }

  function forecastMovingAverage(payload) {
    const values = normalizeSeries(payload.series);
    const horizon = Math.max(1, Number(payload.horizon || 7));
    const requestedWindow = Math.max(1, Number(payload.window || 7));
    const window = Math.min(requestedWindow, values.length || requestedWindow);

    if (!values.length) return { error: 'series_required' };

    const history = [...values];
    const forecast = [];
    for (let i = 0; i < horizon; i += 1) {
      const sample = history.slice(-window);
      const avg = sample.reduce((sum, value) => sum + value, 0) / sample.length;
      const nextValue = Number(avg.toFixed(2));
      forecast.push(nextValue);
      history.push(nextValue);
    }

    return {
      method: 'moving_average',
      horizon,
      window,
      forecast,
      source: 'local'
    };
  }

  function getAiEndpoint() {
    if (!GEMINI_API_KEY) return null;
    const model = encodeURIComponent(GEMINI_MODEL);
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  }

  function extractJson(text) {
    if (!text) return null;
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try fenced code block first.
      const fenceStart = trimmed.indexOf('```');
      if (fenceStart !== -1) {
        const fenceEnd = trimmed.indexOf('```', fenceStart + 3);
        if (fenceEnd !== -1) {
          let fenced = trimmed.slice(fenceStart + 3, fenceEnd).trim();
          if (fenced.startsWith('json')) {
            fenced = fenced.slice(4).trim();
          }
          try {
            return JSON.parse(fenced);
          } catch {
            // fall through to brace extraction
          }
        }
      }
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }

  async function callGemini(prompt) {
    const endpoint = getAiEndpoint();
    if (!endpoint) return { error: 'ai_not_configured' };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `Return ONLY valid JSON with no extra text.\n${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })
      });
      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          bodyText = '';
        }
        console.log('[ai] gemini error', { status: res.status, body: bodyText });
        return { error: 'ai_provider_error', status: res.status };
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const json = extractJson(text);
      if (!json) {
        console.log('[ai] invalid response', { text });
        return { error: 'ai_invalid_response' };
      }
      return json;
    } catch {
      console.log('[ai] gemini error', { message: 'request_failed' });
      return { error: 'ai_provider_error' };
    }
  }

  async function forecast(payload) {
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = payload;
    if (method === 'moving_average') {
      return forecastMovingAverage({ series, horizon, window });
    }
    if (method !== 'gemini') return { error: 'unsupported_method' };
    if (!GEMINI_API_KEY) {
      return forecastMovingAverage({ series, horizon, window });
    }
    const prompt = [
      'You are a forecasting service. Return ONLY valid JSON.',
      'Task: Forecast the next values for the series.',
      'Input JSON:',
      JSON.stringify({ series, horizon, method: 'gemini', window }),
      'Output JSON schema:',
      '{"method":"moving_average","horizon":7,"window":7,"forecast":[1,2,3]}'
    ].join('\n');
    const result = await callGemini(prompt);
    if (result?.error) {
      const fallback = forecastMovingAverage({ series, horizon, window });
      return {
        ...fallback,
        source: 'local_fallback',
        fallback_reason: result.error
      };
    }
    return {
      ...result,
      source: 'ai'
    };
  }

  async function suggestReorder(payload) {
    if (!GEMINI_API_KEY) return { error: 'ai_not_configured' };
    const { branch_id, items = [] } = payload;
    const prompt = [
      'You are a reorder suggestion service. Return ONLY valid JSON.',
      'Task: For each item, compute reorder quantities based on series and on_hand.',
      'Input JSON:',
      JSON.stringify({ branch_id, items }),
      'Output JSON schema:',
      '{"branch_id":"uuid","suggestions":[{"ingredient_id":"id","on_hand":0,"avg_daily":0,"horizon_days":7,"target_stock":0,"reorder_qty":0}]}'
    ].join('\n');
    const result = await callGemini(prompt);
    if (result?.error) return result;
    return result;
  }

  return {
    forecast,
    suggestReorder
  };
};
