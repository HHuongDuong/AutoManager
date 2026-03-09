module.exports = function createEInvoiceService(deps) {
  const {
    db,
    randomUUID,
    issueInvoice,
    writeAuditLog,
    publishRealtime
  } = deps;

  async function getEInvoiceSettings(branchId) {
    const result = await db.query(
      'SELECT branch_id, enabled, provider, config FROM e_invoice_settings WHERE branch_id = $1',
      [branchId]
    );
    if (result.rows.length === 0) return { branch_id: branchId, enabled: false, provider: null, config: null };
    return result.rows[0];
  }

  async function upsertEInvoiceSettings(branchId, enabled, provider, config) {
    const result = await db.query(
      `INSERT INTO e_invoice_settings (branch_id, enabled, provider, config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (branch_id) DO UPDATE SET enabled = EXCLUDED.enabled, provider = EXCLUDED.provider, config = EXCLUDED.config, updated_at = now()
       RETURNING branch_id, enabled, provider, config`,
      [branchId, enabled, provider || null, config || null]
    );
    return result.rows[0];
  }

  async function issueEInvoiceForOrder(req, order) {
    if (!order?.branch_id) return { skipped: true, reason: 'missing_branch' };
    const settings = await getEInvoiceSettings(order.branch_id);
    if (!settings.enabled || !settings.provider) return { skipped: true, reason: 'disabled' };
    const payload = {
      order_id: order.id,
      branch_id: order.branch_id,
      order_type: order.order_type,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      payments: order.payments || [],
      items: order.items || [],
      created_at: order.created_at
    };

    try {
      const result = await issueInvoice(settings.provider, payload, settings.config || {});
      const invoiceId = randomUUID();
      await db.query(
        `INSERT INTO e_invoices (id, branch_id, order_id, provider, status, external_id, payload, response, issued_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [invoiceId, order.branch_id, order.id, settings.provider, result.status || 'ISSUED', result.external_id || null, payload, result.raw || null]
      );
      await writeAuditLog(req, 'EINVOICE_ISSUE', 'e_invoice', invoiceId, { branch_id: order.branch_id, order_id: order.id });
      publishRealtime('einvoice.issued', { id: invoiceId, order_id: order.id, branch_id: order.branch_id, provider: settings.provider }, order.branch_id);
      return { issued: true, id: invoiceId, external_id: result.external_id || null };
    } catch (err) {
      await writeAuditLog(req, 'EINVOICE_ISSUE_FAILED', 'e_invoice', null, { branch_id: order.branch_id, order_id: order.id, error: err.message });
      return { issued: false, error: err.message };
    }
  }

  return {
    getEInvoiceSettings,
    upsertEInvoiceSettings,
    issueEInvoiceForOrder
  };
};
