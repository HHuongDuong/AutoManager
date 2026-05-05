# Tầng server — AutoManager

Tài liệu này mô tả cấu trúc tầng server (Backend) của hệ thống AutoManager. Backend được xây dựng bằng **Node.js + Express**, cung cấp REST API cho tất cả client (web-dashboard, pos-desktop, mobile-app).

## 1. Tổng quan cấu trúc Backend

Backend AutoManager được tổ chức theo mô hình layer kinh điển: từ HTTP Request vào → Router → Controller → Service → Database.

```
services/backend/
├── src/
│   ├── routes/              # API route definitions
│   │   ├── auth.js
│   │   ├── orders.js
│   │   ├── products.js
│   │   ├── inventory.js
│   │   ├── reports.js
│   │   ├── attendance.js
│   │   ├── branches.js
│   │   ├── employees.js
│   │   ├── rbac.js
│   │   ├── tables.js
│   │   ├── auditLogs.js
│   │   └── ai.js
│   │
│   ├── controllers/         # Request handler layer
│   │   ├── authController.js
│   │   ├── ordersController.js
│   │   ├── productsController.js
│   │   ├── inventoryController.js
│   │   ├── reportsController.js
│   │   ├── attendanceController.js
│   │   ├── branchesController.js
│   │   ├── employeesController.js
│   │   ├── rbacController.js
│   │   ├── tablesController.js
│   │   ├── auditLogsController.js
│   │   └── aiController.js
│   │
│   ├── services/            # Business logic layer
│   │   ├── authService.js               # Auth & user
│   │   ├── rbacService.js               # Role & permission
│   │   ├── ordersService.js             # Orders & order items
│   │   ├── productsService.js           # Products & categories
│   │   ├── inventoryService.js          # Inventory & transactions
│   │   ├── attendanceService.js         # Shifts & attendance
│   │   ├── reportsService.js            # Reports & analytics
│   │   ├── branchesService.js           # Branches management
│   │   ├── employeesService.js          # Employees management
│   │   ├── tablesService.js             # Tables management
│   │   ├── auditLogsService.js          # Audit logs
│   │   ├── auditService.js              # Audit trail & logging
│   │   ├── aiService.js                 # AI & suggestions
│   │   ├── accessService.js             # Access control
│   │   ├── attendanceUtils.js           # Attendance helpers
│   │   ├── exportService.js             # Export & format
│   │   ├── productCacheService.js       # Product caching
│   │   ├── realtimeService.js           # WebSocket & realtime
│   │   ├── resourceLookupService.js     # Resource lookup
│   │   └── infra/
│   │       ├── redis.js                 # Redis integration
│   │       └── rabbit.js                # RabbitMQ integration
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT auth, token signing
│   │   ├── branchAccess.js  # Branch scope enforcement
│   │   └── validateBody.js  # Request body validation
│   │
│   ├── validation/          # Schema & validators
│   │   └── schemas.js       # Joi schemas for input validation
│   │
│   ├── config/              # Configuration
│   │   └── db.js            # PostgreSQL connection pool
│   │
│   ├── app.js               # Express app setup
│   ├── index.js             # Server entry point
│   ├── health_check.js      # Health check endpoint
│   └── uploads/             # File uploads (products, etc.)
│
├── package.json
├── Dockerfile               # Docker container config
└── README.md
```

## 2. Chi tiết cấu trúc từng phần

### 2.1. Routes (`src/routes/`)

**Mục đích**: Định tuyến HTTP request tới các controller thích hợp.

**File chính**:
- `auth.js`: POST /auth/login, POST /auth/logout, POST /auth/refresh
- `orders.js`: GET /orders, POST /orders, PATCH /orders/:id, DELETE /orders/:id, POST /orders/:id/items, PATCH /orders/:id/items/:itemId, POST /orders/:id/payments
- `products.js`: GET /products, POST /products, PATCH /products/:id, DELETE /products/:id
- `inventory.js`: GET /inventory, POST /inventory/transactions, GET /inventory/stocktakes, POST /inventory/stocktakes, PATCH /inventory/stocktakes/:id
- `reports.js`: GET /reports/revenue, GET /reports/inventory, GET /reports/attendance, GET /reports/*/export
- `attendance.js`: GET /attendance/logs, POST /attendance/checkin, POST /attendance/checkout
- `branches.js`: GET /branches, POST /branches, PATCH /branches/:id, DELETE /branches/:id, PATCH /branches/:id/location
- `employees.js`: GET /employees, POST /employees, PATCH /employees/:id, DELETE /employees/:id
- `rbac.js`: GET /roles, POST /roles, GET /permissions, POST /role-permissions, POST /user-roles, POST /user-branch-access
- `tables.js`: GET /tables, POST /tables, PATCH /tables/:id, DELETE /tables/:id
- `auditLogs.js`: GET /audit-logs
- `ai.js`: POST /ai/forecast, POST /ai/suggest-reorder

**Quy ước**:
- Resource-based URLs (nouns, not verbs)
- RESTful HTTP methods (GET, POST, PATCH, DELETE)
- Routes mounted on `app` in `app.js` dưới paths như `/orders`, `/products`, etc.
- Middleware (auth, validation) áp dụng trước controller

### 2.2. Controllers (`src/controllers/`)

**Mục đích**: Xử lý HTTP request, validation, gọi service, trả response.

**File chính**:
- `authController.js`: Login, logout, token refresh
- `ordersController.js`: CRUD orders, add/update items, add payments
- `productsController.js`: CRUD products, image upload
- `inventoryController.js`: Transactions, stocktakes, categories, ingredients
- `reportsController.js`: Generate & export reports
- `attendanceController.js`: Check-in/out, logs
- `branchesController.js`: CRUD branches, location update
- `employeesController.js`: CRUD employees
- `rbacController.js`: Role/permission management
- `tablesController.js`: CRUD tables
- `auditLogsController.js`: Fetch audit logs
- `aiController.js`: Forecast & suggestions

**Quy ước**:
- Mỗi controller là một file `.js`
- Export functions tương ứng với action: `loginHandler`, `getOrders`, `createOrder`, etc.
- Controller không chứa business logic (logic nằm ở service)
- Controller kiểm tra auth, validate request, gọi service, catch errors, trả response
- Error handling: try-catch hoặc middleware `express-async-errors`

**Ví dụ structure**:
```javascript
async function createOrder(req, res) {
  // 1. Validate request
  const { branch_id, items, ...body } = req.body;
  
  // 2. Check auth
  const userId = req.user.id;
  
  // 3. Call service
  const order = await ordersService.createOrder(userId, branch_id, body);
  
  // 4. Return response
  res.json({ success: true, data: order });
}
```

### 2.3. Services (`src/services/`)

**Mục đích**: Chứa business logic, gọi database, tích hợp infrastructure.

**File chính - Domain Services**:
- `authService.js`: User authentication, password hashing, JWT
- `rbacService.js`: Role & permission checks, access control
- `ordersService.js`: Order creation, state transitions, totals
- `productsService.js`: Product CRUD, category management, pricing
- `inventoryService.js`: Ingredient management, transactions, stocktakes
- `attendanceService.js`: Shift management, check-in/check-out logic
- `reportsService.js`: Data aggregation, analytics
- `branchesService.js`: Branch CRUD, multi-branch logic
- `employeesService.js`: Employee CRUD, management
- `tablesService.js`: Table CRUD for POS
- `auditLogsService.js`: Fetch & filter audit logs
- `auditService.js`: Log all user actions
- `aiService.js`: Forecast & suggestions using data

**File chính - Utility Services**:
- `accessService.js`: Check branch access, user permissions
- `attendanceUtils.js`: Time calculation, shift helpers
- `exportService.js`: Convert data to CSV/Excel
- `productCacheService.js`: Cache product catalog in Redis
- `realtimeService.js`: WebSocket updates, broadcasting
- `resourceLookupService.js`: Lookup resources by ID

**Infrastructure Services** (folder `infra/`):
- `redis.js`: Redis client, get/set/del operations
- `rabbit.js`: RabbitMQ connection, publish/subscribe

**Quy ước**:
- Mỗi domain = một service file (orders, products, etc.)
- Export async functions: `async function getXxx()`, `async function createXxx(data)`, etc.
- Service gọi `db.query()` hoặc tích hợp infra
- Service không chứa HTTP logic (no req/res)
- Error handling: throw với message chi tiết, controller catch

### 2.4. Middleware (`src/middleware/`)

**Mục đích**: Xử lý cross-cutting concerns (auth, validation, branch scoping).

**File chính**:
- `auth.js`:
  - `signToken(userId, branchId)`: JWT signing
  - `authenticate`: Verify JWT từ request header
  - `requirePermission(permission)`: Check user permission
- `branchAccess.js`: Enforce branch_id scoping (middleware)
- `validateBody.js`: Validate request body bằng Joi schema

**Quy ước**:
- Middleware là function: `(req, res, next) => { ... }`
- Middleware áp dụng dùng `app.use(middleware)` hoặc `router.use(middleware)`
- Authentication middleware set `req.user` từ JWT
- Branch access middleware check `req.body.branch_id` hoặc `req.query.branch_id`

### 2.5. Validation (`src/validation/`)

**Mục đích**: Định nghĩa Joi schema cho input validation.

**File chính**:
- `schemas.js`:
  - `loginSchema`: Email, password validation
  - `orderCreateSchema`: Order items, payment method, branch
  - `productSchema`: Product name, price, category
  - `employeeSchema`: Employee info, position
  - ... (toàn bộ schemas)

**Quy ước**:
- Mỗi schema là một Joi object: `Joi.object({ ... })`
- Schema dùng `validateBody` middleware: `router.post('/...', validateBody(schema), controller)`
- Comprehensive validation: required fields, types, lengths, patterns

### 2.6. Config (`src/config/`)

**Mục đích**: Cấu hình ứng dụng.

**File chính**:
- `db.js`: PostgreSQL connection pool (PG Pool)

**Pattern**:
```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = { pool, query: (text, params) => pool.query(text, params) };
```

**Sử dụng**:
```javascript
const { query } = require('./config/db');
const result = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
```

### 2.7. App Setup (`app.js`)

**Mục đích**: Express app initialization, middleware, routing.

**Nội dung**:
- Load `.env`
- Khởi tạo Express app
- Apply global middleware (CORS, body-parser, error handler)
- Mount routers
- Create HTTP server (cho WebSocket support)
- Export server

**Quy ước**:
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/orders', ordersRouter);
// ...

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = { app };
```

### 2.8. Entry Point (`index.js`)

**Mục đích**: Start server.

**Nội dung**:
```javascript
require('dotenv').config();
const { server } = require('./app');
const port = process.env.PORT || 3000;
server.listen(port, () => console.log('backend listening on', port));
```

### 2.9. Health Check (`health_check.js`)

**Mục đích**: Endpoint kiểm tra sức khỏe ứng dụng.

**Endpoint**: `GET /health`

---

## 3. Data Flow

### 3.1. Luồng request HTTP

```
Client (web/desktop/mobile) gửi HTTP request
  ↓
Express Router nhận và route tới controller
  ↓
Middleware (auth, validate) kiểm tra
  ↓
Controller parse request, gọi Service
  ↓
Service thực hiện business logic, truy cập DB/infra
  ↓
Database trả kết quả
  ↓
Service return data
  ↓
Controller format response
  ↓
Express gửi JSON response về client
```

### 3.2. Ví dụ: Create Order

```
POST /orders (client gửi)
  ↓
ordersRouter → ordersController.createOrder
  ↓
validateBody middleware kiểm tra schema
  ↓
authenticate middleware verify JWT
  ↓
branchAccess middleware check branch_id
  ↓
ordersService.createOrder(userId, branchId, orderData)
  ├─ Tính tổng tiền từ order_items
  ├─ INSERT INTO orders (...)
  ├─ INSERT INTO order_items (...)
  ├─ auditService.logAction(...) ghi audit log
  └─ redisSet(...) cache kết quả
  ↓
return { id, status, total, ... }
  ↓
ordersController return res.json(order)
```

### 3.3. Multi-branch scoping

Mỗi request chứa `branch_id`:
- JWT token chứa `branchId` (hoặc request body/query chứa `branch_id`)
- Middleware `branchAccess` verify user có access vào branch
- Service query với WHERE `branch_id = $1`
- Đảm bảo isolation data giữa các chi nhánh

---

## 4. Database Integration

### 4.1. Connection Pool

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### 4.2. Query Pattern

```javascript
const { query } = require('./config/db');

// Simple query
const result = await query('SELECT * FROM orders WHERE id = $1', [orderId]);

// Insert with transaction (trong service)
await query('BEGIN');
await query('INSERT INTO orders (...) VALUES (...)', [data]);
await query('INSERT INTO order_items (...) VALUES (...)', [itemData]);
await query('COMMIT');
```

### 4.3. Migration

Migrations quản lý trong `db/migrations/`:
- `001_init.sql`: Core tables
- `002_branch_rbac_audit.sql`: RBAC enhancements
- ... (010 migration files)

---

## 5. Infrastructure Integration

### 5.1. Redis (Cache & Locks)

```javascript
const { redisGet, redisSet, redisDelPattern } = require('./services/infra/redis');

// Cache product catalog
await redisSet('products:branch:123', JSON.stringify(products));
const cached = await redisGet('products:branch:123');
```

### 5.2. RabbitMQ (Message Queue)

```javascript
const { publishMessage } = require('./services/infra/rabbit');

// Publish tác vụ nền
await publishMessage('order.created', { orderId, branchId });
```

### 5.3. WebSocket (Realtime)

```javascript
const { broadcast } = require('./services/realtimeService');

// Broadcast update tới tất cả client
broadcast('orders:updated', { orderId, status });
```

---

## 6. Error Handling

### 6.1. Pattern

```javascript
async function createOrder(req, res) {
  try {
    const order = await ordersService.createOrder(...);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  }
}
```

### 6.2. Middleware Error Handler

```javascript
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});
```

---

## 7. Quy ước & Best Practices

### 7.1. Naming Conventions
- **Routes file**: Plural noun (`orders.js`, `products.js`)
- **Controller function**: verb + noun (`getOrders`, `createOrder`, `updateOrder`)
- **Service function**: verb + noun (`getOrders`, `createOrder`, `calculateTotal`)
- **Database column**: snake_case (`order_id`, `created_at`)
- **API endpoint**: Plural resources (`/orders`, `/products`, not `/order`, `/product`)

### 7.2. File Organization
- Mỗi domain = một route file, một controller file, một service file
- Services có thể split thêm cho helper (e.g., `attendanceService.js` + `attendanceUtils.js`)
- Infrastructure consolidate vào `services/infra/`

### 7.3. Async/Await
- Tất cả operations async sử dụng `async/await`
- Express middleware: `express-async-errors` auto catch lỗi từ async

### 7.4. Validation
- Tất cả input validate bằng Joi schema
- Validate middleware áp dụng trước controller
- Custom validation logic trong service nếu cần

### 7.5. Transactions
- Các operation multi-statement (create order + items + payment) dùng transaction
- Pattern: `BEGIN → INSERTs/UPDATEs → COMMIT/ROLLBACK`

### 7.6. Idempotency
- Create operation có `idempotency_key` để retry-safe
- Check idempotency_keys table trước INSERT

### 7.7. Audit Logging
- Mỗi create/update/delete operation ghi audit log
- Log chứa: user_id, action, table, row_id, timestamp, metadata

---

## 8. Build & Development

### 8.1. Environment Variables
File `.env`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/automanager
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your-secret-key
```

### 8.2. Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Or with nodemon for auto-reload
nodemon src/index.js
```

### 8.3. Health Check

```bash
npm run health
```

### 8.4. Create Superuser

```bash
npm run create-superuser
```

### 8.5. Docker

```bash
# Build image
docker build -t automanager-backend .

# Run container
docker run -e DATABASE_URL=postgresql://... -p 3000:3000 automanager-backend
```

---

## 9. Kết luận

Tầng server AutoManager được thiết kế với:
- **Clear separation of concerns**: Routes → Controllers → Services → Database
- **Layered architecture**: Dễ test, mở rộng, bảo trì
- **Multi-domain services**: Mỗi domain (orders, products, etc.) có riêng file
- **Comprehensive validation**: Joi schema cho tất cả input
- **Error handling**: Consistent error response format
- **Infrastructure integration**: Redis, RabbitMQ, PostgreSQL
- **Multi-branch support**: Branch-scoped queries & access control
- **Audit logging**: Track tất cả user actions

Backend cung cấp REST API consistent cho tất cả client, đảm bảo dữ liệu integrity, permission enforcement, và business logic tập trung.

---
Generated: Backend - AutoManager
