const createOrdersService = require('../services/ordersService');
const { buildReceiptPayload, renderReceiptText, renderReceiptHtml } = require('../services/receipt');

module.exports = function createReceiptsController(deps) {
  const { ensureBranchAccess } = deps;
  const ordersService = createOrdersService(deps);

  async function formatReceipt(req, res) {
    try {
      const { order_id, branch_id, items, payments, created_at, total_amount, payment_method } = req.body || {};
      let order = null;
      if (order_id) {
        order = await ordersService.getOrderById(order_id);
        if (!order) return res.status(404).json({ error: 'not_found' });
        if (!(await ensureBranchAccess(req, order.branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
      } else if (branch_id) {
        if (!(await ensureBranchAccess(req, branch_id))) return res.status(403).json({ error: 'branch_forbidden' });
      }
      const payload = buildReceiptPayload({
        order,
        branch_id,
        items,
        payments,
        created_at,
        total_amount,
        payment_method
      });
      return res.json({
        payload,
        text: renderReceiptText(payload),
        html: renderReceiptHtml(payload)
      });
    } catch (err) {
      return res.status(500).json({ error: 'receipt_format_failed', detail: err.message });
    }
  }

  return { formatReceipt };
};
