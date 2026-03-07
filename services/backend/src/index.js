require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const multer = require('multer');
const Joi = require('joi');
const db = require('./db');
const { signToken, authenticate, requirePermission } = require('./auth');
const { redisPing, redisGet, redisSet, redisDelPattern } = require('./infra/redis');
const createRbacRouter = require('./routes/rbac');
const createEmployeesRouter = require('./routes/employees');
const createInventoryRouter = require('./routes/inventory');
const createOrdersRouter = require('./routes/orders');
const createTablesRouter = require('./routes/tables');
const createProductsRouter = require('./routes/products');
const createReportsRouter = require('./routes/reports');
const createAttendanceRouter = require('./routes/attendance');
const createAiRouter = require('./routes/ai');
// const { rabbitPing, publish } = require('./infra/rabbit');
const rabbitPing = async () => ({ enabled: false, reason: 'disabled' });
const publish = async () => {};
const { issueInvoice } = require('./infra/einvoice');
const { buildReceiptPayload, renderReceiptText, renderReceiptHtml } = require('./receipt');
const ExcelJS = require('exceljs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const app = express();
app.use(cors());
app.use(express.json());
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const productUploadDir = path.join(uploadsRoot, 'products');
fs.mkdirSync(productUploadDir, { recursive: true });
app.use('/uploads', express.static(uploadsRoot));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, productUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('invalid_image_type'));
    return cb(null, true);
  }
});
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function publishRealtime(event, payload, branchId) {
  const data = JSON.stringify({ event, branch_id: branchId || null, payload });
  wss.clients.forEach(client => {
    if (client.readyState !== 1) return;
    if (client.allBranches) {
      client.send(data);
      return;
    }
    if (!branchId) {
      client.send(data);
      return;
    }
    if (client.branches?.includes(branchId)) client.send(data);
  });
}

wss.on('connection', async (ws, req) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const branchId = url.searchParams.get('branch_id');
    if (!token) return ws.close(4401, 'unauthorized');
    const decoded = jwt.verify(token, JWT_SECRET);
    const permissions = decoded?.permissions || [];
    const allowed = permissions.includes('RBAC_MANAGE') ? [] : await getAllowedBranchIds(decoded.sub);
    if (!permissions.includes('RBAC_MANAGE') && allowed.length === 0) return ws.close(4403, 'forbidden');
    if (branchId && !permissions.includes('RBAC_MANAGE') && !allowed.includes(branchId)) return ws.close(4403, 'forbidden');
    ws.userId = decoded.sub;
    ws.allBranches = permissions.includes('RBAC_MANAGE');
    ws.branches = permissions.includes('RBAC_MANAGE') ? [] : allowed;
    ws.send(JSON.stringify({ event: 'ws.connected', branch_id: branchId || null }));
  } catch (err) {
    ws.close(4401, 'unauthorized');
  }
});

app.get('/health', async (req, res) => {
  const redis = await redisPing();
  const rabbit = await rabbitPing();
  res.json({ status: 'ok', redis, rabbit });
});

async function getUserRoles(userId) {
  const result = await db.query(
    'SELECT r.id, r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
    [userId]
  );
  return result.rows;
}

async function getUserPermissions(userId) {
  const result = await db.query(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return result.rows.map(r => r.code);
}

async function getAllowedBranchIds(userId) {
  const [empRes, accessRes] = await Promise.all([
    db.query('SELECT branch_id FROM employees WHERE user_id = $1', [userId]),
    db.query('SELECT branch_id FROM user_branch_access WHERE user_id = $1', [userId])
  ]);
  const branches = new Set();
  for (const row of empRes.rows) if (row.branch_id) branches.add(row.branch_id);
  for (const row of accessRes.rows) if (row.branch_id) branches.add(row.branch_id);
  return Array.from(branches);
}

async function ensureBranchAccess(req, branchId) {
  if (req.user?.permissions?.includes('RBAC_MANAGE')) return true;
  if (!branchId) return false;
  if (!req.allowedBranches) req.allowedBranches = await getAllowedBranchIds(req.user.sub);
  return req.allowedBranches.includes(branchId);
}

function branchFilter({ queryKey = 'branch_id', column = 'branch_id' } = {}) {
  return async (req, res, next) => {
    try {
      const branchId = req.query?.[queryKey] || null;
      if (branchId) {
        if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
        req.branchFilter = {
          where: `WHERE ${column} = $1`,
          params: [branchId],
          branchId,
          branchIds: [branchId]
        };
        return next();
      }
      if (req.user?.permissions?.includes('RBAC_MANAGE')) {
        req.branchFilter = { where: '', params: [], branchId: null, branchIds: [] };
        return next();
      }
      const allowed = await getAllowedBranchIds(req.user.sub);
      if (allowed.length === 0) return res.status(403).json({ error: 'branch_forbidden' });
      req.branchFilter = {
        where: `WHERE ${column} = ANY($1)`,
        params: [allowed],
        branchId: null,
        branchIds: allowed
      };
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'branch_filter_failed', detail: err.message });
    }
  };
}

function validateBody(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body || {}, { abortEarly: false, allowUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'invalid_input',
        detail: error.details.map(d => d.message)
      });
    }
    return next();
  };
}

function requireBranchBody({ bodyKey = 'branch_id', required = false, error = 'branch_id_required' } = {}) {
  return async (req, res, next) => {
    try {
      const branchId = req.body?.[bodyKey] || null;
      if (!branchId) {
        if (required) return res.status(400).json({ error });
        return next();
      }
      if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
      req.branchId = branchId;
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'branch_body_failed', detail: err.message });
    }
  };
}

function requireResourceBranch(getBranchId, { notFoundError = 'not_found' } = {}) {
  return async (req, res, next) => {
    try {
      const branchId = await getBranchId(req);
      if (!branchId) return res.status(404).json({ error: notFoundError });
      if (!(await ensureBranchAccess(req, branchId))) return res.status(403).json({ error: 'branch_forbidden' });
      req.resourceBranchId = branchId;
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'branch_resource_failed', detail: err.message });
    }
  };
}

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
app.post('/receipts/format', authenticate, requirePermission('ORDERS_READ'), async (req, res) => {
  try {
    const { order_id, branch_id, items, payments, created_at, total_amount, payment_method } = req.body || {};
    let order = null;
    if (order_id) {
      order = await getOrderById(order_id);
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
});

function toCsv(rows, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [];
  lines.push(headers.map(h => escape(h.label)).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h.key])).join(','));
  }
  return lines.join('\n');
}

async function sendXlsx(res, rows, sheetName, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const keys = rows?.length ? Object.keys(rows[0]) : [];
  worksheet.columns = keys.map(key => ({ header: key, key }));
  if (rows?.length) worksheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
}

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

async function updateOrderTotal(client, orderId) {
  const result = await client.query('SELECT COALESCE(SUM(subtotal), 0) AS total FROM order_items WHERE order_id = $1', [orderId]);
  const total = Number(result.rows[0].total || 0);
  await client.query('UPDATE orders SET total_amount = $2, updated_at = now() WHERE id = $1', [orderId, total]);
  return total;
}

const orderItemSchema = Joi.object({
  product_id: Joi.string().allow(null, ''),
  name: Joi.string().allow(null, ''),
  unit_price: Joi.number().required(),
  quantity: Joi.number().min(1).required()
}).or('product_id', 'name');

const orderCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  order_type: Joi.string().valid('DINE_IN', 'TAKE_AWAY', 'TAKEAWAY', 'DELIVERY').required(),
  table_id: Joi.string().allow(null, ''),
  items: Joi.array().min(1).items(orderItemSchema).required(),
  payments: Joi.array().items(Joi.object({
    amount: Joi.number().min(0).required(),
    payment_method: Joi.string().allow(null, ''),
    provider_metadata: Joi.any().optional()
  })).optional(),
  client_id: Joi.string().allow(null, ''),
  created_by: Joi.string().allow(null, ''),
  metadata: Joi.any().optional()
}).custom((value, helpers) => {
  if (value.order_type === 'DINE_IN' && !value.table_id) {
    return helpers.error('any.custom', { message: 'table_id_required_for_dine_in' });
  }
  return value;
}, 'table_id_required_for_dine_in');

const orderItemAddSchema = Joi.object({
  product_id: Joi.string().allow(null, ''),
  name: Joi.string().allow(null, ''),
  unit_price: Joi.number().required(),
  quantity: Joi.number().min(1).required()
}).or('product_id', 'name');

const orderItemPatchSchema = Joi.object({
  quantity: Joi.number().min(1),
  unit_price: Joi.number().min(0)
}).or('quantity', 'unit_price');

const orderPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().allow(null, ''),
  provider_metadata: Joi.any().optional()
});

const rbacRoleCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const rbacPermissionCreateSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  description: Joi.string().allow(null, '')
});

const rbacRolePermissionAddSchema = Joi.object({
  permission_id: Joi.string().required()
});

const rbacUserRoleAddSchema = Joi.object({
  role_id: Joi.string().required()
});

const rbacUserBranchAddSchema = Joi.object({
  branch_id: Joi.string().required()
});

const employeeCreateSchema = Joi.object({
  username: Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required(),
  branch_id: Joi.string().allow(null, ''),
  full_name: Joi.string().allow(null, ''),
  phone: Joi.string().allow(null, ''),
  position: Joi.string().allow(null, '')
});

const employeePatchSchema = Joi.object({
  full_name: Joi.string().allow(null, ''),
  phone: Joi.string().allow(null, ''),
  position: Joi.string().allow(null, ''),
  branch_id: Joi.string().allow(null, '')
});

const userStatusSchema = Joi.object({
  is_active: Joi.boolean().required()
});

const inventoryCategoryCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const inventoryCategoryPatchSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const ingredientCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  unit: Joi.string().allow(null, ''),
  category_id: Joi.string().allow(null, '')
});

const ingredientPatchSchema = Joi.object({
  name: Joi.string().trim().min(1),
  unit: Joi.string().allow(null, ''),
  category_id: Joi.string().allow(null, '')
});

const inventoryItemSchema = Joi.object({
  ingredient_id: Joi.string().required(),
  quantity: Joi.number().invalid(0).required(),
  unit_cost: Joi.number().allow(null)
});

const inventoryBatchSchema = Joi.object({
  branch_id: Joi.string().required(),
  items: Joi.array().min(1).items(inventoryItemSchema).required(),
  reason: Joi.string().allow(null, '')
});

const inventoryTransactionCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  ingredient_id: Joi.string().required(),
  order_id: Joi.string().allow(null, ''),
  quantity: Joi.number().invalid(0).required(),
  transaction_type: Joi.string().min(1).required(),
  reason: Joi.string().allow(null, ''),
  unit_cost: Joi.number().allow(null)
});

const stocktakeCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  items: Joi.array().min(1).items(Joi.object({
    ingredient_id: Joi.string().required(),
    actual_qty: Joi.number().optional()
  })).required(),
  note: Joi.string().allow(null, '')
});

app.use('/', createRbacRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  publishRealtime,
  validateBody,
  rbacRoleCreateSchema,
  rbacPermissionCreateSchema,
  rbacRolePermissionAddSchema,
  rbacUserRoleAddSchema,
  rbacUserBranchAddSchema
}));

app.use('/', createEmployeesRouter({
  db,
  randomUUID,
  bcrypt,
  authenticate,
  requirePermission,
  branchFilter,
  requireResourceBranch,
  requireBranchBody,
  ensureBranchAccess,
  getEmployeeBranchId,
  writeAuditLog,
  publishRealtime,
  validateBody,
  employeeCreateSchema,
  employeePatchSchema,
  userStatusSchema
}));

app.use('/', createInventoryRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  branchFilter,
  requireBranchBody,
  requireResourceBranch,
  validateBody,
  inventoryCategoryCreateSchema,
  inventoryCategoryPatchSchema,
  ingredientCreateSchema,
  ingredientPatchSchema,
  inventoryBatchSchema,
  inventoryTransactionCreateSchema,
  stocktakeCreateSchema,
  getStocktakeBranchId,
  getIngredientBranchOnHand,
  writeAuditLog,
  publishRealtime
}));

app.use('/', createOrdersRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  branchFilter,
  requireBranchBody,
  requireResourceBranch,
  validateBody,
  orderCreateSchema,
  orderItemAddSchema,
  orderItemPatchSchema,
  orderPaymentSchema,
  updateOrderTotal,
  computeTotal,
  writeAuditLog,
  publishRealtime,
  getOrderById,
  issueEInvoiceForOrder,
  getOrderBranchId
}));

app.use('/', createTablesRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  branchFilter,
  requireBranchBody,
  requireResourceBranch,
  getTableBranchId,
  writeAuditLog,
  publishRealtime
}));

app.use('/', createProductsRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  branchFilter,
  requireBranchBody,
  requireResourceBranch,
  getProductBranchId,
  writeAuditLog,
  publishRealtime,
  invalidateProductsCache,
  upload,
  redisGet,
  redisSet
}));

app.use('/', createReportsRouter({
  db,
  authenticate,
  requirePermission,
  branchFilter,
  sendXlsx,
  toCsv
}));

app.use('/', createAttendanceRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  branchFilter,
  requireResourceBranch,
  getEmployeeBranchId,
  getBranchLocation,
  haversineMeters,
  getShiftCheckStatus,
  writeAuditLog,
  publishRealtime
}));

app.use('/', createAiRouter({
  authenticate,
  requirePermission,
  requireBranchBody,
  writeAuditLog
}));

async function invalidateProductsCache() {
  await redisDelPattern('products:*');
}

app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.message === 'invalid_image_type') {
    return res.status(400).json({ error: 'invalid_image_type' });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'unique_violation', detail: err.detail || err.message });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: 'foreign_key_violation', detail: err.detail || err.message });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'invalid_input', detail: err.detail || err.message });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: 'not_null_violation', detail: err.detail || err.message });
  }
  console.error('unhandled_error', err);
  return res.status(500).json({ error: 'internal_error', detail: err.message });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('backend listening on', port));
