const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const normalizeItems = (items = []) => items.map((item) => {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unit_price || 0);
  const subtotal = Number(item.subtotal ?? (unitPrice * quantity));
  return {
    name: item.name || '',
    quantity,
    unit_price: unitPrice,
    subtotal
  };
});

const buildReceiptPayload = ({ order, branch_id, items, payments, created_at, total_amount, payment_method } = {}) => {
  const sourceItems = order?.items?.length ? order.items : items || [];
  const normalizedItems = normalizeItems(sourceItems);
  const computedTotal = normalizedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const totalAmount = total_amount ?? order?.total_amount ?? computedTotal;
  const createdAt = created_at || order?.created_at || new Date().toISOString();
  const payment = payment_method || order?.payments?.[0]?.payment_method || payments?.[0]?.payment_method || 'CASH';
  const orderId = order?.id || 'LOCAL';
  const branchId = order?.branch_id || branch_id || null;
  return {
    order_id: orderId,
    branch_id: branchId,
    created_at: createdAt,
    payment_method: payment,
    total_amount: totalAmount,
    items: normalizedItems
  };
};

const renderReceiptText = (payload) => {
  const safeSpace = (value) => String(value || '').replace(/\u00a0/g, ' ');
  const createdAt = payload?.created_at ? new Date(payload.created_at) : new Date();
  const lines = [];
  lines.push('AutoManager POS');
  lines.push(`Chi nhánh: ${payload?.branch_id || '---'}`);
  lines.push(`Đơn: ${payload?.order_id || 'LOCAL'}`);
  lines.push(`Thời gian: ${createdAt.toLocaleString('vi-VN')}`);
  lines.push('------------------------------');
  lines.push('Tên            SL   Giá     TT');
  for (const item of payload?.items || []) {
    const name = (item.name || '').slice(0, 12).padEnd(12, ' ');
    const qty = String(item.quantity || 0).padStart(2, ' ');
    const price = safeSpace(formatVnd(item.unit_price || 0));
    const subtotal = safeSpace(formatVnd(item.subtotal || 0));
    const priceShort = price.slice(-8).padStart(8, ' ');
    const subtotalShort = subtotal.slice(-8).padStart(8, ' ');
    lines.push(`${name} ${qty} ${priceShort} ${subtotalShort}`);
  }
  lines.push('------------------------------');
  lines.push(`Tổng: ${formatVnd(payload?.total_amount || 0)}`);
  lines.push(`Thanh toán: ${payload?.payment_method || 'CASH'}`);
  lines.push('Cảm ơn quý khách!');
  lines.push('\n');
  return lines.join('\n');
};

const renderReceiptHtml = (payload) => {
  const createdAt = payload?.created_at ? new Date(payload.created_at) : new Date();
  const rows = (payload?.items || []).map((item) => `
    <tr>
      <td>${item.name || ''}</td>
      <td style="text-align:center;">${item.quantity || 0}</td>
      <td style="text-align:right;">${formatVnd(item.unit_price || 0)}</td>
      <td style="text-align:right;">${formatVnd(item.subtotal || 0)}</td>
    </tr>
  `).join('');
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; width: 280px; }
          h2 { text-align: center; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 0; }
          .line { border-top: 1px dashed #333; margin: 6px 0; }
          .right { text-align: right; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <h2>AutoManager POS</h2>
        <div class="center">Chi nhánh: ${payload?.branch_id || '---'}</div>
        <div class="center">Đơn: ${payload?.order_id || 'LOCAL'}</div>
        <div class="center">Thời gian: ${createdAt.toLocaleString('vi-VN')}</div>
        <div class="line"></div>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>SL</th>
              <th>Giá</th>
              <th>TT</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="line"></div>
        <div class="right"><strong>Tổng: ${formatVnd(payload?.total_amount || 0)}</strong></div>
        <div class="right">Thanh toán: ${payload?.payment_method || 'CASH'}</div>
        <div class="center" style="margin-top:8px;">Cảm ơn quý khách!</div>
      </body>
    </html>
  `;
};

module.exports = {
  buildReceiptPayload,
  renderReceiptText,
  renderReceiptHtml
};
