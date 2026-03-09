module.exports = function createResourceLookupService(deps) {
  const { db } = deps;

  async function getOrderBranchId(orderId) {
    const result = await db.query('SELECT branch_id FROM orders WHERE id = $1', [orderId]);
    return result.rows[0]?.branch_id || null;
  }

  async function getStocktakeBranchId(stocktakeId) {
    const result = await db.query('SELECT branch_id FROM stocktakes WHERE id = $1', [stocktakeId]);
    return result.rows[0]?.branch_id || null;
  }

  async function getIngredientBranchOnHand(branchId, ingredientIds) {
    if (!branchId || !ingredientIds?.length) return new Map();
    const result = await db.query(
      `SELECT ingredient_id,
              COALESCE(SUM(CASE
                WHEN transaction_type = 'IN' THEN quantity
                WHEN transaction_type = 'OUT' THEN -quantity
                WHEN transaction_type = 'ADJUST' THEN quantity
                ELSE 0 END), 0) AS on_hand
       FROM inventory_transactions
       WHERE branch_id = $1 AND ingredient_id = ANY($2)
       GROUP BY ingredient_id`,
      [branchId, ingredientIds]
    );
    return new Map(result.rows.map(r => [r.ingredient_id, Number(r.on_hand || 0)]));
  }

  async function getTableBranchId(tableId) {
    const result = await db.query('SELECT branch_id FROM tables WHERE id = $1', [tableId]);
    return result.rows[0]?.branch_id || null;
  }

  async function getEmployeeBranchId(employeeId) {
    const result = await db.query('SELECT branch_id FROM employees WHERE id = $1', [employeeId]);
    return result.rows[0]?.branch_id || null;
  }

  async function getProductBranchId(productId) {
    const result = await db.query('SELECT branch_id FROM products WHERE id = $1', [productId]);
    return result.rows[0]?.branch_id || null;
  }

  return {
    getOrderBranchId,
    getStocktakeBranchId,
    getIngredientBranchOnHand,
    getTableBranchId,
    getEmployeeBranchId,
    getProductBranchId
  };
};
