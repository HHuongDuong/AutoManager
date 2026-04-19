const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

module.exports = function createAiService() {
  function getAiEndpoint() {
    if (!GROQ_API_KEY) return null;
    return 'https://api.groq.com/openai/v1/chat/completions';
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

  async function callGroq(prompt) {
    const endpoint = getAiEndpoint();
    if (!endpoint) return { error: 'ai_not_configured' };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON with no extra text.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });
      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          bodyText = '';
        }
        console.log('[ai] groq error', { status: res.status, body: bodyText });
        return { error: 'ai_provider_error', status: res.status };
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      const json = extractJson(text);
      if (!json) {
        console.log('[ai] invalid response', { text });
        return { error: 'ai_invalid_response' };
      }
      return json;
    } catch {
      console.log('[ai] groq error', { message: 'request_failed' });
      return { error: 'ai_provider_error' };
    }
  }

  async function forecast(payload) {
    if (!GROQ_API_KEY) return { error: 'ai_not_configured' };
    const { series = [], horizon = 7, method = 'moving_average', window = 7 } = payload;
    const prompt = [
      'You are a forecasting service. Return ONLY valid JSON.',
      'Task: Forecast the next values for the series.',
      'Input JSON:',
      JSON.stringify({ series, horizon, method, window }),
      'Output JSON schema:',
      '{"method":"moving_average","horizon":7,"window":7,"forecast":[1,2,3]}'
    ].join('\n');
    const result = await callGroq(prompt);
    if (result?.error) return result;
    return result;
  }

  async function suggestReorder(payload) {
    if (!GROQ_API_KEY) return { error: 'ai_not_configured' };
    const { branch_id, items = [] } = payload;
    const prompt = [
      'You are a reorder suggestion service. Return ONLY valid JSON.',
      'Task: For each item, compute reorder quantities based on series and on_hand.',
      'Input JSON:',
      JSON.stringify({ branch_id, items }),
      'Output JSON schema:',
      '{"branch_id":"uuid","suggestions":[{"ingredient_id":"id","on_hand":0,"avg_daily":0,"horizon_days":7,"target_stock":0,"reorder_qty":0}]}'
    ].join('\n');
    const result = await callGroq(prompt);
    if (result?.error) return result;
    return result;
  }

  return {
    forecast,
    suggestReorder
  };
};
