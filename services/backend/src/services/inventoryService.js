const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

module.exports = function createInventoryService(deps) {
  const { db, randomUUID, getIngredientBranchOnHand } = deps;

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

  async function getRecentIngredientUsage(branchId) {
    const result = await db.query(
      `SELECT it.ingredient_id,
              i.name,
              i.unit,
              SUM(CASE WHEN it.transaction_type = 'OUT' THEN it.quantity ELSE 0 END) AS total_out
       FROM inventory_transactions it
       JOIN ingredients i ON i.id = it.ingredient_id
       WHERE it.branch_id = $1
         AND it.created_at >= now() - interval '3 days'
       GROUP BY it.ingredient_id, i.name, i.unit
       ORDER BY total_out DESC` ,
      [branchId]
    );
    return result.rows.map(row => ({
      ingredient_id: row.ingredient_id,
      name: row.name,
      unit: row.unit,
      total_out: Number(row.total_out || 0)
    }));
  }

  async function suggestReorderNextDay(payload) {
    const { branch_id } = payload;
    if (!branch_id) return { error: 'branch_required' };
    const usage = await getRecentIngredientUsage(branch_id);
    if (!usage.length) return { branch_id, suggestions: [] };
    const ingredientIds = usage.map(u => u.ingredient_id);
    const onHandMap = await getIngredientBranchOnHand(branch_id, ingredientIds);
    const items = usage.map(row => {
      const onHand = Number(onHandMap.get(row.ingredient_id) ?? 0);
      const avgDaily = Number((row.total_out / 3).toFixed(2));
      return {
        ingredient_id: row.ingredient_id,
        name: row.name,
        unit: row.unit || null,
        on_hand: onHand,
        total_out_3d: row.total_out,
        avg_daily: avgDaily
      };
    });

    const prompt = [
      'You are an inventory planning service. Return ONLY valid JSON.',
      'Task: Recommend which ingredients should be reordered for tomorrow and how much.',
      'Use avg_daily as the expected usage for tomorrow. If on_hand < avg_daily, reorder_qty should cover the shortfall (rounded up).',
      'Input JSON:',
      JSON.stringify({ branch_id, items }),
      'Output JSON schema:',
      '{"branch_id":"uuid","suggestions":[{"ingredient_id":"id","name":"","unit":"","on_hand":0,"avg_daily":0,"reorder_qty":0,"reason":""}]}'
    ].join('\n');

    const result = await callGroq(prompt);
    if (result?.error) return result;
    return result;
  }

  async function listCategories() {
    const result = await db.query('SELECT id, name, created_at FROM inventory_categories ORDER BY name');
    return result.rows;
  }

  async function createCategory(name) {
    const existsRes = await db.query('SELECT 1 FROM inventory_categories WHERE name = $1', [name]);
    if (existsRes.rows.length > 0) return { error: 'inventory_category_exists' };
    const result = await db.query('INSERT INTO inventory_categories (id, name) VALUES ($1, $2) RETURNING id, name, created_at', [randomUUID(), name]);
    return result.rows[0];
  }

  async function updateCategory(id, name) {
    const result = await db.query('UPDATE inventory_categories SET name = $2 WHERE id = $1 RETURNING id, name, created_at', [id, name]);
    return result.rows[0] || null;
  }

  async function deleteCategory(id) {
    const result = await db.query('DELETE FROM inventory_categories WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  async function listIngredients(category_id) {
    const params = [];
    const filters = [];
    if (category_id) {
      params.push(category_id);
      filters.push(`i.category_id = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT i.id, i.name, i.unit, i.category_id, c.name AS category_name
       FROM ingredients i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       ${where}
       ORDER BY i.name`,
      params
    );
    return result.rows;
  }

  async function createIngredient(payload) {
    const { name, unit, category_id } = payload;
    const existsRes = await db.query(
      'SELECT 1 FROM ingredients WHERE name = $1 AND (category_id IS NOT DISTINCT FROM $2)',
      [name, category_id || null]
    );
    if (existsRes.rows.length > 0) return { error: 'ingredient_exists' };
    const result = await db.query(
      'INSERT INTO ingredients (id, name, unit, category_id) VALUES ($1, $2, $3, $4) RETURNING id, name, unit, category_id',
      [randomUUID(), name, unit || null, category_id || null]
    );
    return result.rows[0];
  }

  async function updateIngredient(id, payload) {
    const { name, unit, category_id } = payload;
    const result = await db.query(
      'UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit), category_id = COALESCE($4, category_id) WHERE id = $1 RETURNING id, name, unit, category_id',
      [id, name ?? null, unit ?? null, category_id ?? null]
    );
    return result.rows[0] || null;
  }

  async function deleteIngredient(id) {
    const result = await db.query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  }

  async function listInputs(filter) {
    const { branchFilter, ingredient_id, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [`transaction_type = 'IN'`];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, branch_id, ingredient_id, quantity, unit_cost, (quantity * COALESCE(unit_cost, 0)) AS total_cost, reason, created_by, created_at
       FROM inventory_transactions ${where} ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  }

  async function createBatchTransactions(payload, transactionType, createdBy) {
    const { branch_id, items, reason } = payload;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        if (!item.ingredient_id || qty === 0) continue;
        const row = await client.query(
          'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, ingredient_id, quantity, unit_cost, transaction_type',
          [randomUUID(), branch_id, item.ingredient_id, qty, item.unit_cost || null, transactionType, reason || null, createdBy]
        );
        results.push(row.rows[0]);
      }
      await client.query('COMMIT');
      return { items: results };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function listTransactions(filter) {
    const { branchFilter, ingredient_id, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    if (ingredient_id) { params.push(ingredient_id); filters.push(`ingredient_id = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(`SELECT * FROM inventory_transactions ${where} ORDER BY created_at DESC`, params);
    return result.rows;
  }

  async function createTransaction(payload, createdBy) {
    const { branch_id, ingredient_id, order_id, quantity, transaction_type, reason, unit_cost } = payload;
    const qty = Number(quantity || 0);
    const result = await db.query(
      'INSERT INTO inventory_transactions (id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_at',
      [randomUUID(), branch_id, ingredient_id, order_id || null, qty, unit_cost || null, transaction_type, reason || null, createdBy]
    );
    return result.rows[0];
  }

  async function listStocktakes(filter) {
    const { branchFilter, status, from, to } = filter;
    const params = [...(branchFilter?.params || [])];
    const filters = [];
    if (branchFilter?.where) filters.push(branchFilter.where.replace(/^WHERE /, ''));
    if (status) { params.push(status); filters.push(`status = $${params.length}`); }
    if (from) { params.push(from); filters.push(`created_at >= $${params.length}`); }
    if (to) { params.push(to); filters.push(`created_at <= $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, branch_id, status, note, created_by, approved_by, created_at, approved_at
       FROM stocktakes ${where} ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  }

  async function listStocktakeItems(stocktakeId) {
    const result = await db.query(
      `SELECT si.id, si.stocktake_id, si.ingredient_id, i.name AS ingredient_name, si.system_qty, si.actual_qty, si.delta_qty
       FROM stocktake_items si
       LEFT JOIN ingredients i ON i.id = si.ingredient_id
       WHERE si.stocktake_id = $1 ORDER BY i.name`,
      [stocktakeId]
    );
    return result.rows;
  }

  async function createStocktake(payload, createdBy) {
    const { branch_id, items, note } = payload;
    const ingredientIds = items.map(i => i.ingredient_id).filter(Boolean);
    const onHandMap = await getIngredientBranchOnHand(branch_id, ingredientIds);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const stocktakeId = randomUUID();
      await client.query(
        'INSERT INTO stocktakes (id, branch_id, status, note, created_by) VALUES ($1, $2, $3, $4, $5)',
        [stocktakeId, branch_id, 'DRAFT', note || null, createdBy]
      );
      const createdItems = [];
      for (const item of items) {
        if (!item.ingredient_id) continue;
        const actual = Number(item.actual_qty || 0);
        const system = onHandMap.get(item.ingredient_id) ?? 0;
        const delta = Number(actual - system);
        const row = await client.query(
          `INSERT INTO stocktake_items (id, stocktake_id, ingredient_id, system_qty, actual_qty, delta_qty)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, stocktake_id, ingredient_id, system_qty, actual_qty, delta_qty`,
          [randomUUID(), stocktakeId, item.ingredient_id, system, actual, delta]
        );
        createdItems.push(row.rows[0]);
      }
      await client.query('COMMIT');
      const headerRes = await db.query(
        'SELECT id, branch_id, status, note, created_by, created_at FROM stocktakes WHERE id = $1',
        [stocktakeId]
      );
      return { header: headerRes.rows[0], items: createdItems };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function approveStocktake(stocktakeId, approvedBy) {
    const header = await db.query('SELECT id, branch_id, status FROM stocktakes WHERE id = $1', [stocktakeId]);
    const stocktake = header.rows[0] || null;
    if (!stocktake) return { error: 'not_found' };
    if (stocktake.status !== 'DRAFT') return { error: 'invalid_status' };
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const itemsRes = await client.query('SELECT ingredient_id, delta_qty FROM stocktake_items WHERE stocktake_id = $1', [stocktakeId]);
      for (const item of itemsRes.rows) {
        const delta = Number(item.delta_qty || 0);
        if (delta === 0) continue;
        await client.query(
          `INSERT INTO inventory_transactions (id, branch_id, ingredient_id, quantity, unit_cost, transaction_type, reason, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [randomUUID(), stocktake.branch_id, item.ingredient_id, delta, null, 'ADJUST', `STOCKTAKE:${stocktakeId}`, approvedBy]
        );
      }
      await client.query(
        'UPDATE stocktakes SET status = $2, approved_by = $3, approved_at = now() WHERE id = $1',
        [stocktakeId, 'APPROVED', approvedBy]
      );
      await client.query('COMMIT');
      return { stocktake };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    listInputs,
    suggestReorderNextDay,
    createBatchTransactions,
    listTransactions,
    createTransaction,
    listStocktakes,
    listStocktakeItems,
    createStocktake,
    approveStocktake
  };
};
