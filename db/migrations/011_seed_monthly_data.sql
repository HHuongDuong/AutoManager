-- Migration: 011_seed_monthly_data.sql
-- Seed sample data for one month of restaurant operations (April 2026)

-- Branches
INSERT INTO branches (id, name, address, created_at, latitude, longitude)
SELECT v.id, v.name, v.address, v.created_at, v.latitude, v.longitude
FROM (
  VALUES
    (gen_random_uuid(), 'Downtown', '12 Main St', '2026-03-15 08:00:00+07'::timestamptz, 10.773123, 106.698345),
    (gen_random_uuid(), 'Riverside', '88 River Rd', '2026-03-18 09:00:00+07'::timestamptz, 10.781234, 106.705678)
) AS v(id, name, address, created_at, latitude, longitude)
WHERE NOT EXISTS (
  SELECT 1 FROM branches b WHERE b.name = v.name
);

-- Roles
INSERT INTO roles (id, name)
SELECT v.id, v.name
FROM (
  VALUES
    (gen_random_uuid(), 'Super Admin'),
    (gen_random_uuid(), 'Manager'),
    (gen_random_uuid(), 'Cashier')
) AS v(id, name)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE r.name = v.name
);

-- Permissions (upsert to avoid conflicts)
INSERT INTO permissions (id, code, description)
VALUES
  (gen_random_uuid(), 'RBAC_MANAGE', 'Manage access control'),
  (gen_random_uuid(), 'EINVOICE_MANAGE', 'Manage e-invoices'),
  (gen_random_uuid(), 'ORDERS_READ', 'View/print receipts'),
  (gen_random_uuid(), 'ORDERS_CREATE', 'Create orders'),
  (gen_random_uuid(), 'ORDERS_VIEW', 'View orders'),
  (gen_random_uuid(), 'ORDERS_UPDATE', 'Update orders'),
  (gen_random_uuid(), 'ORDERS_PAY', 'Pay orders'),
  (gen_random_uuid(), 'TABLE_VIEW', 'View tables'),
  (gen_random_uuid(), 'TABLE_MANAGE', 'Manage tables'),
  (gen_random_uuid(), 'EMPLOYEE_VIEW', 'View employees'),
  (gen_random_uuid(), 'EMPLOYEE_MANAGE', 'Manage employees'),
  (gen_random_uuid(), 'PRODUCT_VIEW', 'View products'),
  (gen_random_uuid(), 'PRODUCT_MANAGE', 'Manage products'),
  (gen_random_uuid(), 'INVENTORY_VIEW', 'View inventory'),
  (gen_random_uuid(), 'INVENTORY_MANAGE', 'Manage inventory'),
  (gen_random_uuid(), 'REPORT_VIEW', 'View reports'),
  (gen_random_uuid(), 'ATTENDANCE_VIEW', 'View attendance'),
  (gen_random_uuid(), 'ATTENDANCE_MANAGE', 'Manage attendance'),
  (gen_random_uuid(), 'AI_USE', 'Use AI'),
  (gen_random_uuid(), 'AUDIT_VIEW', 'View audit logs')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

-- Users
INSERT INTO users (id, username, password_hash, is_active, created_at)
VALUES
  (gen_random_uuid(), 'admin', crypt('admin123', gen_salt('bf')), TRUE, '2026-03-10 08:00:00+07'),
  (gen_random_uuid(), 'manager.a', crypt('manager123', gen_salt('bf')), TRUE, '2026-03-12 08:00:00+07'),
  (gen_random_uuid(), 'manager.b', crypt('manager123', gen_salt('bf')), TRUE, '2026-03-12 08:05:00+07'),
  (gen_random_uuid(), 'cashier.a1', crypt('cashier123', gen_salt('bf')), TRUE, '2026-03-12 09:00:00+07'),
  (gen_random_uuid(), 'cashier.a2', crypt('cashier123', gen_salt('bf')), TRUE, '2026-03-12 09:10:00+07'),
  (gen_random_uuid(), 'cashier.b1', crypt('cashier123', gen_salt('bf')), TRUE, '2026-03-12 09:15:00+07'),
  (gen_random_uuid(), 'cashier.b2', crypt('cashier123', gen_salt('bf')), TRUE, '2026-03-12 09:20:00+07')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active;

-- Employees
INSERT INTO employees (id, user_id, branch_id, full_name, phone, position, created_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Alex Nguyen', '0900000001', 'Manager', '2026-03-20 08:30:00+07'),
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Liam Tran', '0900000002', 'Manager', '2026-03-20 08:35:00+07'),
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'cashier.a1' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Mia Pham', '0900000101', 'Cashier', '2026-03-20 09:00:00+07'),
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'cashier.a2' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Noah Le', '0900000102', 'Cashier', '2026-03-20 09:05:00+07'),
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'cashier.b1' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Emma Do', '0900000201', 'Cashier', '2026-03-20 09:10:00+07'),
  (gen_random_uuid(), (SELECT id FROM users WHERE username = 'cashier.b2' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), 'Olivia Ho', '0900000202', 'Cashier', '2026-03-20 09:15:00+07');

-- User roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'Super Admin'
WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'Manager'
WHERE u.username IN ('manager.a', 'manager.b')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'Cashier'
WHERE u.username IN ('cashier.a1', 'cashier.a2', 'cashier.b1', 'cashier.b2')
ON CONFLICT DO NOTHING;

-- Role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'RBAC_MANAGE', 'EINVOICE_MANAGE', 'ORDERS_READ', 'ORDERS_CREATE', 'ORDERS_VIEW', 'ORDERS_UPDATE',
  'ORDERS_PAY', 'TABLE_VIEW', 'TABLE_MANAGE', 'EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE', 'PRODUCT_VIEW',
  'PRODUCT_MANAGE', 'INVENTORY_VIEW', 'INVENTORY_MANAGE', 'REPORT_VIEW', 'ATTENDANCE_VIEW',
  'ATTENDANCE_MANAGE', 'AI_USE', 'AUDIT_VIEW'
)
WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'ORDERS_CREATE', 'ORDERS_VIEW', 'ORDERS_UPDATE', 'ORDERS_PAY', 'PRODUCT_VIEW', 'PRODUCT_MANAGE',
  'INVENTORY_VIEW', 'INVENTORY_MANAGE', 'REPORT_VIEW', 'EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE',
  'ATTENDANCE_VIEW', 'ATTENDANCE_MANAGE', 'TABLE_VIEW', 'TABLE_MANAGE'
)
WHERE r.name = 'Manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'ORDERS_CREATE', 'ORDERS_VIEW', 'ORDERS_UPDATE', 'ORDERS_PAY', 'TABLE_VIEW', 'TABLE_MANAGE', 'PRODUCT_VIEW'
)
WHERE r.name = 'Cashier'
ON CONFLICT DO NOTHING;

-- User branch access
INSERT INTO user_branch_access (user_id, branch_id, created_at)
VALUES
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'manager.a' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'manager.b' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'cashier.a1' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'cashier.a2' LIMIT 1), (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'cashier.b1' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07'),
  ((SELECT id FROM users WHERE username = 'cashier.b2' LIMIT 1), (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), '2026-03-20 08:00:00+07')
ON CONFLICT DO NOTHING;

-- Shifts
INSERT INTO shifts (id, name, start_time, end_time)
VALUES
  (gen_random_uuid(), 'Morning', '06:00', '14:00'),
  (gen_random_uuid(), 'Evening', '14:00', '22:00');

-- Attendance (April 2026)
WITH work_days AS (
  SELECT gs::date AS day
  FROM generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS gs
)
INSERT INTO attendance (id, employee_id, shift_id, check_in, check_out)
SELECT
  gen_random_uuid(),
  e.id,
  s.id,
  (day + time '07:30')::timestamptz,
  (day + time '15:30')::timestamptz
FROM employees e
JOIN shifts s ON s.name = CASE WHEN e.position = 'Manager' THEN 'Morning' ELSE 'Evening' END
CROSS JOIN work_days;

-- Tables
WITH branch_list AS (
  SELECT id FROM branches
)
INSERT INTO tables (id, branch_id, name, status)
SELECT
  gen_random_uuid(),
  b.id,
  CONCAT('T', LPAD(t::text, 2, '0')),
  'AVAILABLE'
FROM branch_list b
CROSS JOIN generate_series(1, 10) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM tables tb WHERE tb.branch_id = b.id AND tb.name = CONCAT('T', LPAD(t::text, 2, '0'))
);

-- Product categories
INSERT INTO product_categories (id, name)
SELECT v.id, v.name
FROM (
  VALUES
    (gen_random_uuid(), 'Món chính'),
    (gen_random_uuid(), 'Đồ uống'),
    (gen_random_uuid(), 'Tráng miệng'),
    (gen_random_uuid(), 'Combo')
) AS v(id, name)
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories c WHERE c.name = v.name
);

-- Inventory categories
INSERT INTO inventory_categories (id, name, created_at)
SELECT v.id, v.name, v.created_at
FROM (
  VALUES
    (gen_random_uuid(), 'Thịt', '2026-03-22 08:00:00+07'::timestamptz),
    (gen_random_uuid(), 'Rau củ', '2026-03-22 08:00:00+07'::timestamptz),
    (gen_random_uuid(), 'Khô', '2026-03-22 08:00:00+07'::timestamptz),
    (gen_random_uuid(), 'Đồ uống', '2026-03-22 08:00:00+07'::timestamptz)
) AS v(id, name, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_categories c WHERE c.name = v.name
);

-- Ingredients
INSERT INTO ingredients (id, name, unit, category_id)
SELECT
  v.id,
  v.name,
  v.unit,
  (SELECT id FROM inventory_categories WHERE name = v.category_name ORDER BY id LIMIT 1)
FROM (
  VALUES
    (gen_random_uuid(), 'Bò', 'kg', 'Thịt'),
    (gen_random_uuid(), 'Heo', 'kg', 'Thịt'),
    (gen_random_uuid(), 'Gạo', 'kg', 'Khô'),
    (gen_random_uuid(), 'Bún', 'kg', 'Khô'),
    (gen_random_uuid(), 'Rau thơm', 'kg', 'Rau củ'),
    (gen_random_uuid(), 'Hạt cà phê', 'kg', 'Đồ uống'),
    (gen_random_uuid(), 'Cam', 'kg', 'Đồ uống'),
    (gen_random_uuid(), 'Đường', 'kg', 'Khô')
) AS v(id, name, unit, category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM ingredients i WHERE i.name = v.name
);

-- Products (per-branch catalog)
INSERT INTO products (id, branch_id, category_id, sku, name, price, metadata, created_at, image_url, is_active)
SELECT
  gen_random_uuid(),
  b.id,
  c.id,
  v.sku,
  v.name,
  v.price,
  v.metadata::jsonb,
  v.created_at::timestamptz,
  v.image_url,
  TRUE
FROM (
  VALUES
    ('Downtown', 'Món chính', 'DT-PHO-01', 'Phở bò', 45.00, '{"tags":["noodle","beef"],"spicy":false}', '2026-03-25 10:00:00+07', '/uploads/products/pho-bo.jpg'),
    ('Downtown', 'Món chính', 'DT-BUN-01', 'Bún chả', 42.00, '{"tags":["noodle","pork"],"spicy":false}', '2026-03-25 10:05:00+07', '/uploads/products/bun-cha.jpg'),
    ('Downtown', 'Món chính', 'DT-COM-01', 'Cơm tấm', 40.00, '{"tags":["rice"],"spicy":false}', '2026-03-25 10:10:00+07', '/uploads/products/com-tam.jpg'),
    ('Downtown', 'Món chính', 'DT-BMI-01', 'Bánh mì', 25.00, '{"tags":["bread"],"spicy":false}', '2026-03-25 10:15:00+07', '/uploads/products/banh-mi.jpg'),
    ('Downtown', 'Đồ uống', 'DT-TRA-01', 'Trà đá', 5.00, '{"tags":["ice"],"size":"small"}', '2026-03-25 10:20:00+07', '/uploads/products/tra-da.jpg'),
    ('Downtown', 'Đồ uống', 'DT-CAFE-01', 'Cà phê đen', 18.00, '{"tags":["coffee"],"size":"small"}', '2026-03-25 10:25:00+07', '/uploads/products/ca-phe-den.jpg'),
    ('Downtown', 'Đồ uống', 'DT-ORANGE-01', 'Nước cam', 22.00, '{"tags":["juice"],"size":"small"}', '2026-03-25 10:30:00+07', '/uploads/products/nuoc-cam.jpg'),
    ('Downtown', 'Tráng miệng', 'DT-CHE-01', 'Chè đậu đỏ', 20.00, '{"tags":["dessert"],"size":"small"}', '2026-03-25 10:35:00+07', '/uploads/products/che-dau-do.jpg'),

    ('Riverside', 'Món chính', 'RV-PHO-01', 'Phở bò', 47.00, '{"tags":["noodle","beef"],"spicy":false}', '2026-03-26 09:00:00+07', '/uploads/products/pho-bo.jpg'),
    ('Riverside', 'Món chính', 'RV-BUN-01', 'Bún chả', 44.00, '{"tags":["noodle","pork"],"spicy":false}', '2026-03-26 09:05:00+07', '/uploads/products/bun-cha.jpg'),
    ('Riverside', 'Món chính', 'RV-COM-01', 'Cơm tấm', 41.00, '{"tags":["rice"],"spicy":false}', '2026-03-26 09:10:00+07', '/uploads/products/com-tam.jpg'),
    ('Riverside', 'Món chính', 'RV-BMI-01', 'Bánh mì', 26.00, '{"tags":["bread"],"spicy":false}', '2026-03-26 09:15:00+07', '/uploads/products/banh-mi.jpg'),
    ('Riverside', 'Đồ uống', 'RV-TRA-01', 'Trà đá', 5.00, '{"tags":["ice"],"size":"small"}', '2026-03-26 09:20:00+07', '/uploads/products/tra-da.jpg'),
    ('Riverside', 'Đồ uống', 'RV-CAFE-01', 'Cà phê đen', 19.00, '{"tags":["coffee"],"size":"small"}', '2026-03-26 09:25:00+07', '/uploads/products/ca-phe-den.jpg'),
    ('Riverside', 'Đồ uống', 'RV-ORANGE-01', 'Nước cam', 23.00, '{"tags":["juice"],"size":"small"}', '2026-03-26 09:30:00+07', '/uploads/products/nuoc-cam.jpg'),
    ('Riverside', 'Tráng miệng', 'RV-CHE-01', 'Chè đậu đỏ', 21.00, '{"tags":["dessert"],"size":"small"}', '2026-03-26 09:35:00+07', '/uploads/products/che-dau-do.jpg')
) AS v(branch_name, category_name, sku, name, price, metadata, created_at, image_url)
JOIN LATERAL (
  SELECT id FROM branches
  WHERE name = v.branch_name
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1
) b ON TRUE
JOIN LATERAL (
  SELECT id FROM product_categories
  WHERE name = v.category_name
  ORDER BY id
  LIMIT 1
) c ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.branch_id = b.id AND p.sku = v.sku
);

-- Branch-specific prices (same-branch overrides)
INSERT INTO product_branch_prices (product_id, branch_id, price, updated_at)
SELECT p.id, p.branch_id, p.price * 0.95, '2026-03-28 10:00:00+07'
FROM products p
WHERE p.name IN ('Phở bò', 'Bún chả', 'Cà phê đen')
ON CONFLICT (product_id, branch_id) DO UPDATE
SET price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at;

-- E-invoice settings
INSERT INTO e_invoice_settings (branch_id, enabled, provider, config, created_at, updated_at)
VALUES
  ((SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1), TRUE, 'VNPT', '{"tax_code":"0312345678","template":"01GTKT"}', '2026-03-25 09:00:00+07', '2026-03-25 09:00:00+07'),
  ((SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1), FALSE, 'VNPT', '{"tax_code":"0312345679","template":"01GTKT"}', '2026-03-25 09:00:00+07', '2026-03-25 09:00:00+07')
ON CONFLICT (branch_id) DO UPDATE
SET enabled = EXCLUDED.enabled,
    provider = EXCLUDED.provider,
    config = EXCLUDED.config,
    updated_at = EXCLUDED.updated_at;

-- Seed orders for April 2026
CREATE TEMP TABLE seed_orders (
  day DATE,
  seq INT,
  branch_id UUID,
  branch_code TEXT,
  order_code TEXT,
  client_id TEXT,
  order_type TEXT,
  table_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_paid BOOLEAN
);

WITH days AS (
  SELECT gs::date AS day
  FROM generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS gs
),
seqs AS (
  SELECT generate_series(1, 50) AS seq
),
branch_ref AS (
  SELECT
    (SELECT id FROM branches WHERE name = 'Downtown' ORDER BY created_at DESC NULLS LAST LIMIT 1) AS downtown_id,
    (SELECT id FROM branches WHERE name = 'Riverside' ORDER BY created_at DESC NULLS LAST LIMIT 1) AS riverside_id
),
order_base AS (
  SELECT
    d.day,
    s.seq,
    CASE WHEN s.seq <= 30 THEN br.downtown_id ELSE br.riverside_id END AS branch_id,
    CASE WHEN s.seq <= 30 THEN 'DT' ELSE 'RV' END AS branch_code
  FROM days d
  CROSS JOIN seqs s
  CROSS JOIN branch_ref br
)
INSERT INTO seed_orders (day, seq, branch_id, branch_code, order_code, client_id, order_type, table_id, created_by, created_at, updated_at, is_paid)
SELECT
  ob.day,
  ob.seq,
  ob.branch_id,
  ob.branch_code,
  CONCAT('OD-', TO_CHAR(ob.day, 'YYYYMMDD'), '-', ob.branch_code, '-', ob.seq),
  CONCAT('POS-', ob.branch_code, '-', TO_CHAR(ob.day, 'YYYYMMDD'), '-', ob.seq),
  CASE
    WHEN ob.seq % 5 = 0 THEN 'DELIVERY'
    WHEN ob.seq % 2 = 1 THEN 'DINE_IN'
    ELSE 'TAKEAWAY'
  END,
  CASE
    WHEN ob.seq % 2 = 1 AND ob.seq % 5 != 0 THEN (
      SELECT id FROM tables
      WHERE branch_id = ob.branch_id
      ORDER BY name
      LIMIT 1 OFFSET ((ob.seq - 1) % 10)
    )
    ELSE NULL
  END,
  CASE
    WHEN ob.branch_code = 'DT' AND ob.seq % 2 = 1 THEN (SELECT id FROM users WHERE username = 'cashier.a1' LIMIT 1)
    WHEN ob.branch_code = 'DT' THEN (SELECT id FROM users WHERE username = 'cashier.a2' LIMIT 1)
    WHEN ob.branch_code = 'RV' AND ob.seq % 2 = 1 THEN (SELECT id FROM users WHERE username = 'cashier.b1' LIMIT 1)
    ELSE (SELECT id FROM users WHERE username = 'cashier.b2' LIMIT 1)
  END,
  (ob.day + time '08:00' + (ob.seq * interval '10 minutes'))::timestamptz,
  (ob.day + time '08:00' + (ob.seq * interval '10 minutes') + interval '20 minutes')::timestamptz,
  CASE WHEN ob.seq % 7 = 0 THEN FALSE ELSE TRUE END
FROM order_base ob;

INSERT INTO orders (
  id, branch_id, client_id, idempotency_key, created_by, order_code, order_type, table_id,
  order_status, payment_status, total_amount, metadata, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  s.branch_id,
  s.client_id,
  CASE WHEN s.seq = 1 THEN CONCAT('idem-', s.order_code) ELSE NULL END,
  s.created_by,
  s.order_code,
  s.order_type,
  s.table_id,
  CASE WHEN s.is_paid THEN 'PAID' ELSE 'OPEN' END,
  CASE WHEN s.is_paid THEN 'PAID' ELSE 'UNPAID' END,
  0,
  jsonb_build_object('channel', 'pos', 'note', CASE WHEN s.order_type = 'DINE_IN' THEN 'dine_in' WHEN s.order_type = 'DELIVERY' THEN 'delivery' ELSE 'takeaway' END),
  s.created_at,
  s.updated_at
FROM seed_orders s
WHERE NOT EXISTS (
  SELECT 1 FROM orders o2 WHERE o2.order_code = s.order_code
);

-- Order items
WITH product_list AS (
  SELECT id, name, price, branch_id,
         ROW_NUMBER() OVER (PARTITION BY branch_id ORDER BY name) AS rn
  FROM products
)
INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal, created_at)
SELECT
  gen_random_uuid(),
  o.id,
  p.id,
  p.name,
  (1 + (s.seq % 3))::int,
  p.price,
  (1 + (s.seq % 3)) * p.price,
  (o.created_at + interval '3 minutes')::timestamptz
FROM seed_orders s
JOIN orders o ON o.order_code = s.order_code
JOIN LATERAL (
  SELECT id, name, price
  FROM product_list
  WHERE branch_id = s.branch_id
    AND rn IN ((s.seq % 8) + 1, ((s.seq + 3) % 8) + 1, ((s.seq + 5) % 8) + 1)
  ORDER BY rn
) p ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
);

-- Update totals
UPDATE orders o
SET total_amount = t.total,
    updated_at = o.created_at + interval '25 minutes'
FROM (
  SELECT order_id, SUM(subtotal) AS total
  FROM order_items
  GROUP BY order_id
) t
WHERE o.id = t.order_id;

-- Payments
INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata, created_at)
SELECT
  gen_random_uuid(),
  o.id,
  o.total_amount,
  CASE WHEN s.seq % 4 = 0 THEN 'CARD' WHEN s.seq % 4 = 1 THEN 'CASH' WHEN s.seq % 4 = 2 THEN 'QR' ELSE 'WALLET' END,
  jsonb_build_object('channel', 'pos', 'order_code', o.order_code),
  (o.created_at + interval '12 minutes')::timestamptz
FROM orders o
JOIN seed_orders s ON s.order_code = o.order_code
WHERE s.is_paid = TRUE
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id);

-- Idempotency keys (daily seq=1)
INSERT INTO idempotency_keys (id, key, user_id, order_id, created_at, expires_at)
SELECT
  gen_random_uuid(),
  CONCAT('idem-', o.order_code),
  o.created_by,
  o.id,
  o.created_at,
  o.created_at + interval '2 hours'
FROM orders o
JOIN seed_orders s ON s.order_code = o.order_code
WHERE s.seq = 1
ON CONFLICT (key) DO NOTHING;

-- E-invoices for some paid orders
INSERT INTO e_invoices (id, branch_id, order_id, provider, status, external_id, payload, response, issued_at, created_at)
SELECT
  gen_random_uuid(),
  o.branch_id,
  o.id,
  'VNPT',
  'ISSUED',
  CONCAT('INV-', o.order_code),
  jsonb_build_object('order_code', o.order_code, 'amount', o.total_amount),
  jsonb_build_object('status', 'ok', 'issued', TRUE),
  (o.created_at + interval '15 minutes')::timestamptz,
  (o.created_at + interval '15 minutes')::timestamptz
FROM orders o
JOIN seed_orders s ON s.order_code = o.order_code
WHERE s.is_paid = TRUE
  AND EXTRACT(day FROM s.day)::int % 5 = 0
  AND NOT EXISTS (SELECT 1 FROM e_invoices e WHERE e.order_id = o.id);

-- Inventory transactions (IN deliveries every 7 days)
WITH deliver_days AS (
  SELECT gs::date AS day
  FROM generate_series('2026-04-01'::date, '2026-04-29'::date, '5 day') AS gs
)
INSERT INTO inventory_transactions (
  id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_by, created_at
)
SELECT
  gen_random_uuid(),
  b.id,
  i.id,
  NULL,
  (120 + (EXTRACT(day FROM d.day)::int % 20))::numeric,
  (1.8 + (EXTRACT(day FROM d.day)::int % 4))::numeric(12,2),
  'IN',
  'periodic restock',
  CASE WHEN b.name = 'Downtown' THEN (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1) ELSE (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1) END,
  (d.day + time '08:00')::timestamptz
FROM deliver_days d
JOIN branches b ON TRUE
JOIN ingredients i ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_transactions t
  WHERE t.branch_id = b.id
    AND t.ingredient_id = i.id
    AND t.transaction_type = 'IN'
    AND t.created_at::date = d.day
);

-- Inventory transactions (OUT per order)
INSERT INTO inventory_transactions (
  id, branch_id, ingredient_id, order_id, quantity, unit_cost, transaction_type, reason, created_by, created_at
)
SELECT
  gen_random_uuid(),
  o.branch_id,
  ing.id,
  o.id,
  (0.3 + (s.seq % 4) * 0.2)::numeric,
  NULL,
  'OUT',
  'sale consumption',
  o.created_by,
  (o.created_at + interval '5 minutes')::timestamptz
FROM orders o
JOIN seed_orders s ON s.order_code = o.order_code
JOIN LATERAL (
  SELECT id FROM ingredients ORDER BY name LIMIT 1 OFFSET (s.seq % 5)
) ing ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_transactions t WHERE t.order_id = o.id AND t.transaction_type = 'OUT'
);

-- Stocktakes
INSERT INTO stocktakes (id, branch_id, status, note, created_by, approved_by, created_at, approved_at)
SELECT
  gen_random_uuid(),
  b.id,
  'APPROVED',
  'Mid-month stocktake',
  CASE WHEN b.name = 'Downtown' THEN (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1) ELSE (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1) END,
  CASE WHEN b.name = 'Downtown' THEN (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1) ELSE (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1) END,
  '2026-04-15 20:00:00+07',
  '2026-04-15 22:00:00+07'
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM stocktakes st
  WHERE st.branch_id = b.id
    AND st.note = 'Mid-month stocktake'
    AND st.created_at::date = '2026-04-15'
);

INSERT INTO stocktakes (id, branch_id, status, note, created_by, approved_by, created_at, approved_at)
SELECT
  gen_random_uuid(),
  b.id,
  'APPROVED',
  'End-month stocktake',
  CASE WHEN b.name = 'Downtown' THEN (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1) ELSE (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1) END,
  CASE WHEN b.name = 'Downtown' THEN (SELECT id FROM users WHERE username = 'manager.a' LIMIT 1) ELSE (SELECT id FROM users WHERE username = 'manager.b' LIMIT 1) END,
  '2026-04-30 20:00:00+07',
  '2026-04-30 22:00:00+07'
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM stocktakes st
  WHERE st.branch_id = b.id
    AND st.note = 'End-month stocktake'
    AND st.created_at::date = '2026-04-30'
);

-- Stocktake items
INSERT INTO stocktake_items (id, stocktake_id, ingredient_id, system_qty, actual_qty, delta_qty)
SELECT
  gen_random_uuid(),
  s.id,
  i.id,
  (100 + (EXTRACT(day FROM s.created_at)::int % 20))::numeric,
  (98 + (EXTRACT(day FROM s.created_at)::int % 20))::numeric,
  ((98 + (EXTRACT(day FROM s.created_at)::int % 20)) - (100 + (EXTRACT(day FROM s.created_at)::int % 20)))::numeric
FROM stocktakes s
JOIN ingredients i ON TRUE
ON CONFLICT (stocktake_id, ingredient_id) DO UPDATE
SET system_qty = EXCLUDED.system_qty,
    actual_qty = EXCLUDED.actual_qty,
    delta_qty = EXCLUDED.delta_qty;

-- Audit logs for orders
INSERT INTO audit_logs (
  id, user_id, action, object_type, object_id, payload, created_at,
  branch_id, request_id, method, path, ip, user_agent
)
SELECT
  gen_random_uuid(),
  o.created_by,
  'ORDER_CREATE',
  'order',
  o.id,
  jsonb_build_object('order_code', o.order_code, 'total', o.total_amount),
  o.created_at,
  o.branch_id,
  CONCAT('req-', o.order_code),
  'POST',
  '/orders',
  '10.0.0.10',
  'seed-script'
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs al WHERE al.request_id = CONCAT('req-', o.order_code)
);

INSERT INTO audit_logs (
  id, user_id, action, object_type, object_id, payload, created_at,
  branch_id, request_id, method, path, ip, user_agent
)
SELECT
  gen_random_uuid(),
  o.created_by,
  'ORDER_PAY',
  'order',
  o.id,
  jsonb_build_object('order_code', o.order_code, 'amount', o.total_amount),
  o.created_at + interval '12 minutes',
  o.branch_id,
  CONCAT('req-pay-', o.order_code),
  'POST',
  '/orders/:id/payments',
  '10.0.0.10',
  'seed-script'
FROM orders o
JOIN seed_orders s ON s.order_code = o.order_code
WHERE s.is_paid = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs al WHERE al.request_id = CONCAT('req-pay-', o.order_code)
  );

DROP TABLE seed_orders;
