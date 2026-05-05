# Mô tả chi tiết schema cơ sở dữ liệu

Tài liệu này mô tả chi tiết các bảng chính trong schema của AutoManager (theo các migration trong `db/migrations`). Bao gồm cột, kiểu dữ liệu, ràng buộc quan trọng, index và ghi chú về quan hệ/ứng dụng.

---

## `branches`
- Mục đích: Thông tin chi nhánh / cửa hàng.
- Cột chính:
  - `id` UUID PK, default `gen_random_uuid()`
  - `name` TEXT NOT NULL
  - `address` TEXT
  - `latitude` NUMERIC(10,6) (tùy migration)
  - `longitude` NUMERIC(10,6)
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
- Indexes: (không có index đặc biệt mặc định), dùng làm FK cho nhiều bảng.
- Ghi chú: Là trung tâm tham chiếu cho order, product_branch_prices, inventory, audit_logs, stocktakes, v.v.

---

## `users`
- Mục đích: Tài khoản đăng nhập hệ thống (người dùng hệ thống).
- Cột chính:
  - `id` UUID PK
  - `username` TEXT UNIQUE NOT NULL
  - `password_hash` TEXT
  - `is_active` BOOLEAN DEFAULT TRUE
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
- Quan hệ: `users.id` referenced by `employees.user_id`, `orders.created_by`, `audit_logs.user_id`, `idempotency_keys.user_id`, `inventory_transactions.created_by`, v.v.
- Ghi chú: Credentials/identity; quyền/role map thông qua `user_roles`.

---

## `employees`
- Mục đích: Hồ sơ nhân viên / mapping user ↔ branch.
- Cột chính:
  - `id` UUID PK
  - `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
  - `branch_id` UUID FK -> `branches(id)`
  - `full_name`, `phone`, `position`, `created_at`
- Index: nên có index trên `user_id`/`branch_id` (migration tạo index user_branch_access riêng).
- Ghi chú: Sử dụng cho attendance, shift assignment, nhân viên liên quan đến inventory/orders.

---

## RBAC: `roles`, `permissions`, `user_roles`, `role_permissions`

### `roles`
- Mục đích: Định nghĩa vai trò (e.g., Admin, Cashier, Manager)
- Cột chính:
  - `id` UUID PK
  - `name` TEXT NOT NULL (e.g., 'Admin', 'Cashier', 'Warehouse Manager')
- Ghi chú: Tham chiếu từ `user_roles`, liên kết quyền thông qua `role_permissions`.

### `permissions`
- Mục đích: Danh sách các quyền hệ thống (e.g., ORDER_CREATE, INVENTORY_MANAGE)
- Cột chính:
  - `id` UUID PK
  - `code` TEXT UNIQUE NOT NULL (e.g., 'ORDERS_CREATE', 'PRODUCT_MANAGE')
  - `description` TEXT
- Ghi chú: Được seed trong migration `008_seed_permissions.sql`; không nên thay đổi code sau deployment.

### `user_roles`
- Mục đích: Mapping user ↔ role (many-to-many)
- Cột chính:
  - `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
  - `role_id` UUID FK -> `roles(id)` ON DELETE CASCADE
  - Composite PK: (user_id, role_id)
- Ghi chú: Cho phép một user có nhiều role. Query join để lấy permissions của user: `SELECT DISTINCT p.* FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = ?`

### `role_permissions`
- Mục đích: Mapping role ↔ permission (many-to-many)
- Cột chính:
  - `role_id` UUID FK -> `roles(id)` ON DELETE CASCADE
  - `permission_id` UUID FK -> `permissions(id)` ON DELETE CASCADE
  - Composite PK: (role_id, permission_id)
- Ghi chú: Định nghĩa quyền của từng vai trò. Thay đổi ở đây ảnh hưởng ngay tất cả user có role đó.

---

## `user_branch_access`
- Mục đích: Quyền truy cập theo branch cho user (scoped access)
- Cột chính: `user_id` FK, `branch_id` FK, `created_at`
- Indexes: có index cho `user_id` và `branch_id` theo migration
- Ghi chú: Dùng để giới hạn dữ liệu theo chi nhánh trong middleware `branchAccess`.

---

## `audit_logs`
- Mục đích: Lưu nhật ký hành động người dùng / hệ thống.
- Cột chính:
  - `id` UUID PK
  - `user_id` UUID FK -> `users(id)`
  - `branch_id` UUID FK -> `branches(id)` (mở rộng)
  - `action` TEXT NOT NULL
  - `object_type` TEXT, `object_id` UUID
  - `payload` JSONB
  - Trường mở rộng: `request_id`, `method`, `path`, `ip`, `user_agent`
  - `created_at` TIMESTAMP
- Indexes: idx on (branch_id, created_at DESC)
- Ghi chú: Dùng cho forensics; migration bổ sung metadata để kết hợp với SIEM.

---

---

## `shifts`
- Mục đích: Định nghĩa ca làm việc (mẫu ca: start_time, end_time)
- Cột chính:
  - `id` UUID PK
  - `name` TEXT (e.g., 'Morning Shift', 'Evening Shift', 'Ca sáng')
  - `start_time` TIME (e.g., '08:00:00')
  - `end_time` TIME (e.g., '16:00:00')
- Ghi chú: Là định nghĩa template; để gán nhân viên vào ca, liên kết qua bảng attendance. Không có FK branch — shift là global hoặc có thể mở rộng thêm branch_id.

---

## `attendance`
- Mục đích: Ghi nhận check-in / check-out cho nhân viên theo ca
- Cột chính:
  - `id` UUID PK
  - `employee_id` UUID FK -> `employees(id)`
  - `shift_id` UUID FK -> `shifts(id)` (ca làm việc)
  - `check_in` TIMESTAMP WITH TIME ZONE (thời điểm check-in)
  - `check_out` TIMESTAMP WITH TIME ZONE (thời điểm check-out, nullable)
- Indexes: nên có index (employee_id, check_in DESC), (shift_id)
- Ghi chú: Record được tạo khi check-in; check_out được cập nhật khi nhân viên logout/check-out. Tính tổng giờ từ sự chênh lệch check_out - check_in.

---

## `tables` (Bàn nhà hàng)
- Mục đích: Quản lý bàn phục vụ cho phục vụ bàn (DINE_IN)
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK -> `branches(id)`
  - `name` TEXT (e.g., 'Table 1', 'Bàn góc')
  - `status` TEXT DEFAULT 'AVAILABLE' (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE)
- Indexes: index trên (branch_id, status)
- Ghi chú: Liên kết với `orders.table_id` khi tạo order DINE_IN. Status tự động cập nhật: AVAILABLE → OCCUPIED khi tạo order, OCCUPIED → AVAILABLE khi order close.

---

## Sản phẩm & danh mục

### `product_categories`
- Mục đích: Phân loại sản phẩm (e.g., Đồ uống, Đồ ăn)
- Cột chính:
  - `id` UUID PK
  - `name` TEXT NOT NULL
- Ghi chú: FK từ `products.category_id`. Có thể thêm column như `description`, `icon_url` sau.

### `products`
- Mục đích: Catalog sản phẩm / thực đơn
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK -> `branches(id)` (có thể NULL nếu sản phẩm là global)
  - `category_id` UUID FK -> `product_categories(id)`
  - `sku` TEXT (mã sản phẩm, dùng để import/sync)
  - `name` TEXT NOT NULL
  - `price` NUMERIC(12,2) NOT NULL (giá mặc định)
  - `metadata` JSONB (lưu info bổ sung: prep_time, allergens, calories, v.v.)
  - `image_url` TEXT
  - `is_active` BOOLEAN DEFAULT TRUE (soft-delete)
  - `created_at` TIMESTAMP
- Indexes: `idx_products_branch` (branch_id, id), `idx_products_active` (is_active)
- Ghi chú: Có `product_branch_prices` để quản lý giá khác nhau theo branch. Snapshot tên/giá vào `order_items` để lịch sử không đổi.

### `product_branch_prices`
- Mục đích: Quản lý giá sản phẩm riêng theo chi nhánh
- Cột chính:
  - `product_id` UUID FK -> `products(id)` ON DELETE CASCADE
  - `branch_id` UUID FK -> `branches(id)` ON DELETE CASCADE
  - `price` NUMERIC(12,2) NOT NULL
  - `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
  - Composite PK: (product_id, branch_id)
- Indexes: `idx_product_branch_prices_branch` (branch_id, product_id)
- Ghi chú: Query để lấy giá: `SELECT COALESCE(pbp.price, p.price) FROM products p LEFT JOIN product_branch_prices pbp ON p.id = pbp.product_id AND pbp.branch_id = ? WHERE p.id = ?`

---

---

## `orders`
- Mục đích: Đơn bán hàng / hóa đơn
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK -> `branches(id)` NOT NULL
  - `client_id` TEXT (external customer id, có thể NULL)
  - `idempotency_key` TEXT (dùng để tạo order idempotent)
  - `created_by` UUID FK -> `users(id)` (nhân viên/cashier tạo)
  - `order_code` TEXT (mã order hiển thị, e.g., 'ORD-001')
  - `order_type` TEXT NOT NULL (DINE_IN, TAKEAWAY, DELIVERY)
  - `table_id` UUID FK -> `tables(id)` (nếu DINE_IN)
  - `order_status` TEXT DEFAULT 'OPEN' (OPEN, PAID, CLOSED, CANCELLED)
  - `payment_status` TEXT DEFAULT 'UNPAID' (UNPAID, PARTIAL, PAID)
  - `total_amount` NUMERIC(12,2) DEFAULT 0 (recalculated từ order_items)
  - `metadata` JSONB (customer notes, delivery address, v.v.)
  - `created_at`, `updated_at` TIMESTAMP
- Indexes: `idx_orders_branch_created` (branch_id, created_at)
- Ghi chú: Lifecycle: OPEN → thêm items → thanh toán → PAID → CLOSED. `idempotency_key` tham chiếu bảng `idempotency_keys` để retry safely.

---

## `order_items`
- Mục đích: Chi tiết từng món trong order
- Cột chính:
  - `id` UUID PK
  - `order_id` UUID FK -> `orders(id)` ON DELETE CASCADE
  - `product_id` UUID FK -> `products(id)` (có thể NULL nếu sản phẩm xóa)
  - `name` TEXT NOT NULL (snapshot tên sản phẩm lúc order)
  - `quantity` INTEGER NOT NULL DEFAULT 1
  - `unit_price` NUMERIC(12,2) NOT NULL (giá lúc bán)
  - `subtotal` NUMERIC(12,2) NOT NULL (quantity × unit_price)
  - `created_at` TIMESTAMP
- Indexes: idx on order_id
- Ghi chú: Snapshot name/price vì product có thể đổi/xóa sau. Subtotal recalculated từ order_items để update `orders.total_amount`.

---

## `payments`
- Mục đích: Ghi nhận thanh toán cho order
- Cột chính:
  - `id` UUID PK
  - `order_id` UUID FK -> `orders(id)` ON DELETE CASCADE
  - `amount` NUMERIC(12,2) NOT NULL (số tiền thanh toán)
  - `payment_method` TEXT NOT NULL (CASH, CARD, MOBILEPAY, TRANSFER)
  - `provider_metadata` JSONB (thông tin từ payment gateway, e.g., transaction id, auth code)
  - `created_at` TIMESTAMP
- Ghi chú: Một order có thể có nhiều payments (thanh toán theo lần). Tổng `SUM(payments.amount)` quyết định `orders.payment_status`.

---

## Nguyên liệu & Tồn kho

### `inventory_categories`
- Mục đích: Phân loại nguyên liệu (e.g., Rượu, Gia vị, Đông lạnh)
- Cột chính:
  - `id` UUID PK
  - `name` TEXT NOT NULL
- Ghi chú: FK từ `ingredients.category_id`.

### `ingredients`
- Mục đích: Danh sách nguyên liệu / hàng hóa tồn kho
- Cột chính:
  - `id` UUID PK
  - `name` TEXT NOT NULL
  - `unit` TEXT (e.g., 'kg', 'lít', 'chiếc')
  - `category_id` UUID FK -> `inventory_categories(id)`
- Ghi chú: Khác với `products` — ingredients là nguyên liệu dùng để nấu, còn products là món bán. Có thể thêm columns: reorder_point, lead_time, supplier.

### `inventory_transactions`
- Mục đích: Lưu mọi biến động tồn kho (purchase, sale consumption, adjustment, waste)
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK NOT NULL
  - `ingredient_id` UUID FK -> `ingredients(id)`
  - `order_id` UUID FK -> `orders(id)` (nếu consume từ order)
  - `quantity` NUMERIC(12,3) NOT NULL (dấu: dương = nhập/điều chỉnh, âm = xuất/tiêu thụ)
  - `unit_cost` NUMERIC(12,2) (giá cost cho tính toán)
  - `transaction_type` TEXT NOT NULL (PURCHASE, SALE, ADJUST, WASTE, RETURN)
  - `reason` TEXT (ghi chú nguyên do)
  - `created_by` UUID FK -> `users(id)` (ai thực hiện)
  - `created_at` TIMESTAMP
- Indexes: `idx_invtx_branch` (branch_id, created_at), index (ingredient_id, branch_id)
- Ghi chú: On-hand = `SUM(quantity)` grouped by branch + ingredient. Dùng để tính cost of goods sold, inventory value, audit stocktake.

### `stocktakes`
- Mục đích: Kiểm kê kho (bảng master cho đợt kiểm kê)
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK -> `branches(id)` NOT NULL
  - `status` TEXT DEFAULT 'DRAFT' (DRAFT, INPROGRESS, COMPLETED, APPROVED, CANCELLED)
  - `note` TEXT
  - `created_by` UUID FK -> `users(id)` (người tạo)
  - `approved_by` UUID FK -> `users(id)` (người phê duyệt, nullable)
  - `created_at`, `approved_at` TIMESTAMP
- Indexes: `idx_stocktakes_branch_created` (branch_id, created_at)
- Ghi chú: Là master record; mỗi stocktake có nhiều stocktake_items. Workflow: DRAFT → INPROGRESS (nhân viên nhập qty thực) → COMPLETED → APPROVED (quản lý kiểm tra).

### `stocktake_items`
- Mục đích: Chi tiết từng nguyên liệu trong một đợt kiểm kê
- Cột chính:
  - `id` UUID PK
  - `stocktake_id` UUID FK -> `stocktakes(id)` ON DELETE CASCADE
  - `ingredient_id` UUID FK -> `ingredients(id)`
  - `system_qty` NUMERIC(12,3) (số lượng theo hệ thống)
  - `actual_qty` NUMERIC(12,3) (số lượng kiểm kê thực tế)
  - `delta_qty` NUMERIC(12,3) (sai số = actual - system)
  - Unique constraint: (stocktake_id, ingredient_id)
- Ghi chú: Dùng delta_qty để create inventory_transactions của type ADJUST khi approved, để reconcile hệ thống với thực tế.

---

## Hóa đơn điện tử

### `e_invoice_settings`
- Mục đích: Cấu hình bật/tắt và thiết lập nhà cung cấp hóa đơn điện tử cho mỗi chi nhánh
- Cột chính:
  - `branch_id` UUID PK FK -> `branches(id)` ON DELETE CASCADE
  - `enabled` BOOLEAN DEFAULT FALSE
  - `provider` TEXT (e.g., 'ViettelEinvoice', 'MyeinvoiceTech')
  - `config` JSONB (cấu hình provider-specific như API key, env, auth method)
  - `created_at` TIMESTAMP
  - `updated_at` TIMESTAMP
- Ghi chú: Một branch có một cấu hình e-invoice. Nếu disabled, orders sẽ không phát hành e-invoice tự động.

### `e_invoices`
- Mục đích: Theo dõi phát hành hóa đơn điện tử cho orders
- Cột chính:
  - `id` UUID PK
  - `branch_id` UUID FK -> `branches(id)`
  - `order_id` UUID FK -> `orders(id)`
  - `provider` TEXT NOT NULL (e.g., 'ViettelEinvoice')
  - `status` TEXT NOT NULL DEFAULT 'PENDING' (PENDING, ISSUED, FAILED, CANCELLED)
  - `external_id` TEXT (ID trả về từ nhà cung cấp)
  - `payload` JSONB (dữ liệu gửi đi)
  - `response` JSONB (phản hồi từ API)
  - `issued_at` TIMESTAMP (khi hóa đơn được phát hành thành công)
  - `created_at` TIMESTAMP
- Indexes: idx on (branch_id, created_at DESC), idx on (order_id)
- Ghi chú: Mỗi order có thể có multiple e_invoices (nếu retry/resubmit); xem status để biết tình trạng.

---

## Idempotency & Retry

### `idempotency_keys`
- Mục đích: Tránh tạo order trùng khi retry (idempotent create order)
- Cột chính:
  - `id` UUID PK
  - `key` TEXT UNIQUE NOT NULL (idempotency key do client gửi)
  - `user_id` UUID FK -> `users(id)`
  - `order_id` UUID FK -> `orders(id)` (order tạo từ key này)
  - `created_at` TIMESTAMP
  - `expires_at` TIMESTAMP (mặc định +2 giờ để cleanup)
- Ghi chú: Khi create order với `idempotency_key`, kiểm tra bảng này trước; nếu key tồn tại và chưa expire, trả về order hiện có thay vì tạo lại. Dùng cho retry-safe API.

---

## Ghi chú chung & gợi ý cải tiến

### Constraints & Data Validation
- Thêm CHECK constraints cho các trường numeric:
  - `products.price >= 0`, `products.is_active NOT NULL`
  - `orders.total_amount >= 0`, `payments.amount > 0`
  - `order_items.quantity > 0`, `inventory_transactions.quantity != 0`
  - `attendance.check_out >= attendance.check_in` (if both present)
- Enforce NOT NULL trên các FK và business key fields

### Performance Indexes
- Bảng lớn như `orders`, `inventory_transactions`, `audit_logs` nên có index composite trên (branch_id, created_at):
  - `CREATE INDEX idx_orders_branch_created ON orders(branch_id, created_at DESC)`
  - `CREATE INDEX idx_invtx_branch_created ON inventory_transactions(branch_id, created_at DESC)`
- Index trên status fields cho filtering: `orders(order_status)`, `e_invoices(status)`, `stocktakes(status)`
- Index trên FK columns thường join: `payments(order_id)`, `attendance(employee_id)`, `stocktake_items(ingredient_id)`

### Reporting & Analytics
- Cân nhắc materialized views hoặc denormalized tables cho báo cáo nặng:
  - Daily revenue snapshot (branch, date, total, payment methods)
  - Inventory on-hand summary (branch, ingredient, qty, value)
  - Attendance summary (employee, month, total_hours, absent_days)
- Hoặc sử dụng data warehouse / OLAP layer riêng

### Data Retention & Cleanup
- `idempotency_keys`: clean up expired records (cron job: `DELETE FROM idempotency_keys WHERE expires_at < now()`)
- `audit_logs`: archive sau 12 tháng để OLTP performance; giữ lại cho regulatory compliance
- `inventory_transactions`: giữ lại tất cả để audit trail; có thể archive để separate storage
- `e_invoices`: giữ lại permanent; có thể denormalize status vào orders table

### Soft-delete vs Hard-delete
- `products.is_active`: hiện là soft-delete; consider expand cho `employees`, `branches` nếu muốn giữ lịch sử
- `orders`, `payments`, `order_items`: dùng hard delete cascade (ON DELETE CASCADE) — không nên xóa orders vì audit
- `users`, `roles`: cân nhắc soft-delete hoặc archive table

### Multi-branch Data Isolation
- Mọi table có `branch_id` (hoặc FK employees → branches) nên có policy:
  - Middleware `branchAccess` validate user có access vào branch_id
  - RLS (Row Level Security) tại DB level nếu hoàn toàn cần thiết
- `audit_logs.branch_id` giúp track per-branch activity

### Extension Columns & Flexibility
- `metadata` JSONB là good pattern cho:
  - `products`: allergens, prep_time, display_order, tags
  - `orders`: special_notes, customer_preferences, delivery_details
  - `e_invoices`: custom provider fields
  - `employees`: shift_preferences, emergency_contact
- Schema migration friendly: thêm column mới không ảnh hưởng existing rows

### Query Patterns
```sql
-- Get order với items và payments
SELECT o.*, json_agg(json_build_object('id', oi.id, 'name', oi.name, 'qty', oi.quantity)) AS items
FROM orders o 
LEFT JOIN order_items oi ON o.id = oi.order_id 
WHERE o.id = ? 
GROUP BY o.id;

-- Get product với giá branch-specific
SELECT p.*, COALESCE(pbp.price, p.price) AS current_price 
FROM products p 
LEFT JOIN product_branch_prices pbp ON p.id = pbp.product_id AND pbp.branch_id = ?
WHERE p.is_active = TRUE;

-- Inventory on-hand
SELECT ingredient_id, SUM(quantity) AS on_hand 
FROM inventory_transactions 
WHERE branch_id = ? 
GROUP BY ingredient_id;

-- Attendance time calc
SELECT employee_id, EXTRACT(EPOCH FROM (check_out - check_in))/3600 AS hours_worked 
FROM attendance 
WHERE shift_id = ? AND check_out IS NOT NULL;
```

---

## Tham khảo & File liên quan
- Migrations: `db/migrations/001_init.sql` ... `db/migrations/010_product_active.sql`
- Backend services: `services/backend/src/services/` (ordersService, inventoryService, etc.)
- Controllers & routes: `services/backend/src/controllers/`, `services/backend/src/routes/`
- DB config: `services/backend/src/config/db.js` (connection pool)


