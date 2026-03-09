require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const multer = require('multer');
const db = require('./config/db');
const { signToken, authenticate, requirePermission } = require('./middleware/auth');
const createBranchAccess = require('./middleware/branchAccess');
const validateBody = require('./middleware/validateBody');
const { redisPing, redisGet, redisSet, redisDelPattern } = require('./services/infra/redis');
const createAccessService = require('./services/accessService');
const createAuditService = require('./services/auditService');
const createAttendanceUtils = require('./services/attendanceUtils');
const { toCsv, sendXlsx } = require('./services/exportService');
const createEInvoiceService = require('./services/einvoiceService');
const createProductCacheService = require('./services/productCacheService');
const createRealtimeService = require('./services/realtimeService');
const createResourceLookupService = require('./services/resourceLookupService');
const createAuthRouter = require('./routes/auth');
const createBranchesRouter = require('./routes/branches');
const createAuditLogsRouter = require('./routes/auditLogs');
const {
  loginSchema,
  branchCreateSchema,
  branchPatchSchema,
  branchLocationSchema,
  orderCreateSchema,
  orderItemAddSchema,
  orderItemPatchSchema,
  orderPaymentSchema,
  rbacRoleCreateSchema,
  rbacPermissionCreateSchema,
  rbacRolePermissionAddSchema,
  rbacUserRoleAddSchema,
  rbacUserBranchAddSchema,
  employeeCreateSchema,
  employeePatchSchema,
  userStatusSchema,
  inventoryCategoryCreateSchema,
  inventoryCategoryPatchSchema,
  ingredientCreateSchema,
  ingredientPatchSchema,
  inventoryBatchSchema,
  inventoryTransactionCreateSchema,
  stocktakeCreateSchema
} = require('./validation/schemas');
const createRbacRouter = require('./routes/rbac');
const createEmployeesRouter = require('./routes/employees');
const createInventoryRouter = require('./routes/inventory');
const createOrdersRouter = require('./routes/orders');
const createTablesRouter = require('./routes/tables');
const createProductsRouter = require('./routes/products');
const createReceiptsRouter = require('./routes/receipts');
const createReportsRouter = require('./routes/reports');
const createAttendanceRouter = require('./routes/attendance');
const createAiRouter = require('./routes/ai');
// const { rabbitPing, publish } = require('./services/infra/rabbit');
const rabbitPing = async () => ({ enabled: false, reason: 'disabled' });
const publish = async () => {};
const { issueInvoice } = require('./services/infra/einvoice');

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

const accessService = createAccessService({ db });
const { getAllowedBranchIds } = accessService;
const { ensureBranchAccess, branchFilter, requireBranchBody, requireResourceBranch } = createBranchAccess({ getAllowedBranchIds });
const resourceLookupService = createResourceLookupService({ db });
const {
  getOrderBranchId,
  getStocktakeBranchId,
  getIngredientBranchOnHand,
  getTableBranchId,
  getEmployeeBranchId,
  getProductBranchId
} = resourceLookupService;
const attendanceUtils = createAttendanceUtils({ db });
const { getBranchLocation, haversineMeters, getShiftCheckStatus } = attendanceUtils;
const { publishRealtime } = createRealtimeService({ server, jwtSecret: JWT_SECRET, getAllowedBranchIds });
const { invalidateProductsCache } = createProductCacheService({ redisDelPattern });
const { writeAuditLog } = createAuditService({ db });
const { issueEInvoiceForOrder } = createEInvoiceService({
  db,
  randomUUID,
  issueInvoice,
  writeAuditLog,
  publishRealtime
});

app.get('/health', async (req, res) => {
  const redis = await redisPing();
  const rabbit = await rabbitPing();
  res.json({ status: 'ok', redis, rabbit });
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

app.use('/', createAuthRouter({
  db,
  bcrypt,
  signToken,
  validateBody,
  loginSchema,
  getUserRoles: accessService.getUserRoles,
  getUserPermissions: accessService.getUserPermissions
}));

app.use('/', createBranchesRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  validateBody,
  branchCreateSchema,
  branchPatchSchema,
  branchLocationSchema,
  getAllowedBranchIds: accessService.getAllowedBranchIds,
  writeAuditLog,
  publishRealtime
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
  writeAuditLog,
  publishRealtime,
  issueEInvoiceForOrder,
  getOrderBranchId
}));

app.use('/', createReceiptsRouter({
  db,
  randomUUID,
  authenticate,
  requirePermission,
  ensureBranchAccess
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

app.use('/', createAuditLogsRouter({
  db,
  authenticate,
  requirePermission,
  getAllowedBranchIds: accessService.getAllowedBranchIds
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

module.exports = { app, server };
