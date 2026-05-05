-- Seed a full operating month for 5 branches.
-- Coverage: 2026-04-01 through 2026-04-30.
-- Characteristics:
-- - 5 branches with branch-scoped staff, tables, menu, receipts, stocktakes
-- - Around 20-25 paid and closed orders per day per branch
-- - VND-friendly integer selling prices
-- - Inventory IN / OUT / ADJUST generated from actual seeded sales recipes

CREATE TEMP TABLE seed_branch_specs (
  branch_code TEXT PRIMARY KEY,
  branch_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  price_delta NUMERIC(12,2) NOT NULL
);

INSERT INTO seed_branch_specs (branch_code, branch_index, name, address, latitude, longitude, price_delta)
VALUES
  ('mydinh', 1, 'Chi nhanh My Dinh', '26 My Dinh, Nam Tu Liem, Ha Noi', 21.030075, 105.773944, 0),
  ('caugiay', 2, 'Chi nhanh Cau Giay', '118 Cau Giay, Ha Noi', 21.033781, 105.800482, 1000),
  ('haibatrung', 3, 'Chi nhanh Hai Ba Trung', '52 Pho Hue, Ha Noi', 21.015912, 105.850521, 0),
  ('phunhuan', 4, 'Chi nhanh Phu Nhuan', '177 Phan Xich Long, TP HCM', 10.801901, 106.686978, 2000),
  ('thaodien', 5, 'Chi nhanh Thao Dien', '39 Xuan Thuy, TP HCM', 10.803847, 106.731421, 3000);

INSERT INTO branches (id, name, address, latitude, longitude, created_at)
SELECT
  gen_random_uuid(),
  s.name,
  s.address,
  s.latitude,
  s.longitude,
  TIMESTAMPTZ '2026-03-25 08:00:00+07'
FROM seed_branch_specs s;

CREATE TEMP TABLE tmp_branches AS
SELECT
  b.id,
  s.branch_code,
  s.branch_index,
  s.name,
  s.price_delta
FROM branches b
JOIN seed_branch_specs s ON s.name = b.name;

INSERT INTO e_invoice_settings (branch_id, enabled, provider, config, created_at, updated_at)
SELECT
  b.id,
  TRUE,
  'VNPT_INVOICE',
  jsonb_build_object(
    'tax_code', '0312026' || lpad(b.branch_index::TEXT, 2, '0'),
    'serial_prefix', upper(b.branch_code),
    'issue_mode', 'AUTO'
  ),
  TIMESTAMPTZ '2026-03-25 08:30:00+07',
  TIMESTAMPTZ '2026-03-25 08:30:00+07'
FROM tmp_branches b;

INSERT INTO shifts (id, name, start_time, end_time)
VALUES
  (gen_random_uuid(), 'Morning', TIME '06:30', TIME '14:30'),
  (gen_random_uuid(), 'Midday', TIME '10:30', TIME '18:30'),
  (gen_random_uuid(), 'Evening', TIME '14:00', TIME '22:00');

CREATE TEMP TABLE tmp_shifts AS
SELECT id, name, start_time, end_time
FROM shifts;

CREATE TEMP TABLE seed_role_specs (
  role_name TEXT PRIMARY KEY
);

INSERT INTO seed_role_specs (role_name)
VALUES
  ('Super Admin'),
  ('Area Manager'),
  ('Branch Manager'),
  ('Cashier'),
  ('Barista'),
  ('Inventory Staff');

INSERT INTO roles (id, name)
SELECT gen_random_uuid(), role_name
FROM seed_role_specs;

CREATE TEMP TABLE tmp_roles AS
SELECT id, name
FROM roles
WHERE name IN (SELECT role_name FROM seed_role_specs);

CREATE TEMP TABLE seed_role_permissions (
  role_name TEXT NOT NULL,
  permission_code TEXT NOT NULL
);

INSERT INTO seed_role_permissions (role_name, permission_code)
SELECT 'Super Admin', p.code
FROM permissions p;

INSERT INTO seed_role_permissions (role_name, permission_code)
VALUES
  ('Area Manager', 'EINVOICE_MANAGE'),
  ('Area Manager', 'ORDERS_READ'),
  ('Area Manager', 'ORDERS_CREATE'),
  ('Area Manager', 'ORDERS_VIEW'),
  ('Area Manager', 'ORDERS_UPDATE'),
  ('Area Manager', 'ORDERS_PAY'),
  ('Area Manager', 'TABLE_VIEW'),
  ('Area Manager', 'TABLE_MANAGE'),
  ('Area Manager', 'EMPLOYEE_VIEW'),
  ('Area Manager', 'EMPLOYEE_MANAGE'),
  ('Area Manager', 'PRODUCT_VIEW'),
  ('Area Manager', 'PRODUCT_MANAGE'),
  ('Area Manager', 'INVENTORY_VIEW'),
  ('Area Manager', 'INVENTORY_MANAGE'),
  ('Area Manager', 'REPORT_VIEW'),
  ('Area Manager', 'ATTENDANCE_VIEW'),
  ('Area Manager', 'ATTENDANCE_MANAGE'),
  ('Area Manager', 'AI_USE'),
  ('Area Manager', 'AUDIT_VIEW'),
  ('Branch Manager', 'ORDERS_READ'),
  ('Branch Manager', 'ORDERS_CREATE'),
  ('Branch Manager', 'ORDERS_VIEW'),
  ('Branch Manager', 'ORDERS_UPDATE'),
  ('Branch Manager', 'ORDERS_PAY'),
  ('Branch Manager', 'TABLE_VIEW'),
  ('Branch Manager', 'TABLE_MANAGE'),
  ('Branch Manager', 'EMPLOYEE_VIEW'),
  ('Branch Manager', 'PRODUCT_VIEW'),
  ('Branch Manager', 'PRODUCT_MANAGE'),
  ('Branch Manager', 'INVENTORY_VIEW'),
  ('Branch Manager', 'INVENTORY_MANAGE'),
  ('Branch Manager', 'REPORT_VIEW'),
  ('Branch Manager', 'ATTENDANCE_VIEW'),
  ('Branch Manager', 'ATTENDANCE_MANAGE'),
  ('Branch Manager', 'EINVOICE_MANAGE'),
  ('Cashier', 'ORDERS_READ'),
  ('Cashier', 'ORDERS_CREATE'),
  ('Cashier', 'ORDERS_VIEW'),
  ('Cashier', 'ORDERS_UPDATE'),
  ('Cashier', 'ORDERS_PAY'),
  ('Cashier', 'TABLE_VIEW'),
  ('Cashier', 'PRODUCT_VIEW'),
  ('Cashier', 'ATTENDANCE_VIEW'),
  ('Cashier', 'ATTENDANCE_MANAGE'),
  ('Barista', 'ORDERS_VIEW'),
  ('Barista', 'PRODUCT_VIEW'),
  ('Barista', 'INVENTORY_VIEW'),
  ('Barista', 'ATTENDANCE_VIEW'),
  ('Barista', 'ATTENDANCE_MANAGE'),
  ('Inventory Staff', 'PRODUCT_VIEW'),
  ('Inventory Staff', 'INVENTORY_VIEW'),
  ('Inventory Staff', 'INVENTORY_MANAGE'),
  ('Inventory Staff', 'REPORT_VIEW'),
  ('Inventory Staff', 'ATTENDANCE_VIEW'),
  ('Inventory Staff', 'ATTENDANCE_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT
  r.id,
  p.id
FROM seed_role_permissions srp
JOIN tmp_roles r ON r.name = srp.role_name
JOIN permissions p ON p.code = srp.permission_code;

CREATE TEMP TABLE seed_inventory_categories (
  category_name TEXT PRIMARY KEY
);

INSERT INTO seed_inventory_categories (category_name)
VALUES
  ('Coffee and Tea Base'),
  ('Milk and Syrup'),
  ('Bakery and Dessert'),
  ('Kitchen Savory'),
  ('Fresh Produce');

INSERT INTO inventory_categories (id, name, created_at)
SELECT gen_random_uuid(), category_name, TIMESTAMPTZ '2026-03-25 09:00:00+07'
FROM seed_inventory_categories;

CREATE TEMP TABLE tmp_inventory_categories AS
SELECT id, name
FROM inventory_categories
WHERE name IN (SELECT category_name FROM seed_inventory_categories);

CREATE TEMP TABLE seed_ingredient_specs (
  ingredient_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category_name TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  ingredient_index INTEGER NOT NULL
);

INSERT INTO seed_ingredient_specs (ingredient_code, name, unit, category_name, unit_cost, ingredient_index)
VALUES
  ('coffee_beans', 'Coffee Beans House Blend', 'g', 'Coffee and Tea Base', 320, 1),
  ('black_tea', 'Black Tea Leaf', 'g', 'Coffee and Tea Base', 180, 2),
  ('jasmine_tea', 'Jasmine Tea Leaf', 'g', 'Coffee and Tea Base', 200, 3),
  ('matcha_powder', 'Matcha Powder', 'g', 'Coffee and Tea Base', 550, 4),
  ('milk_tea_powder', 'Milk Tea Powder', 'g', 'Coffee and Tea Base', 110, 5),
  ('chocolate_powder', 'Chocolate Powder', 'g', 'Coffee and Tea Base', 160, 6),
  ('fresh_milk', 'Fresh Milk', 'ml', 'Milk and Syrup', 32, 7),
  ('condensed_milk', 'Condensed Milk', 'ml', 'Milk and Syrup', 25, 8),
  ('sugar_syrup', 'Sugar Syrup', 'ml', 'Milk and Syrup', 10, 9),
  ('peach_syrup', 'Peach Syrup', 'ml', 'Milk and Syrup', 70, 10),
  ('lychee_syrup', 'Lychee Syrup', 'ml', 'Milk and Syrup', 68, 11),
  ('yogurt', 'Yogurt Base', 'ml', 'Milk and Syrup', 40, 12),
  ('mango_puree', 'Mango Puree', 'ml', 'Milk and Syrup', 55, 13),
  ('passion_puree', 'Passion Fruit Puree', 'ml', 'Milk and Syrup', 60, 14),
  ('soda_water', 'Soda Water', 'ml', 'Milk and Syrup', 12, 15),
  ('tapioca_pearls', 'Tapioca Pearls', 'g', 'Milk and Syrup', 45, 16),
  ('croissant_piece', 'Butter Croissant', 'piece', 'Bakery and Dessert', 10500, 17),
  ('tiramisu_slice', 'Tiramisu Slice', 'piece', 'Bakery and Dessert', 18000, 18),
  ('sandwich_bread', 'Sandwich Bread Slice', 'piece', 'Kitchen Savory', 1200, 19),
  ('chicken_filling', 'Grilled Chicken Filling', 'g', 'Kitchen Savory', 190, 20),
  ('wrap_sheet', 'Wrap Sheet', 'piece', 'Kitchen Savory', 6500, 21),
  ('sausage_piece', 'Breakfast Sausage', 'piece', 'Kitchen Savory', 9000, 22),
  ('egg_piece', 'Fresh Egg', 'piece', 'Kitchen Savory', 3000, 23),
  ('rice_cooked', 'Cooked Rice', 'g', 'Kitchen Savory', 18, 24),
  ('grilled_chicken', 'Grilled Chicken Thigh', 'g', 'Kitchen Savory', 210, 25),
  ('spaghetti_portion', 'Spaghetti Portion', 'portion', 'Kitchen Savory', 14000, 26),
  ('bolognese_sauce', 'Bolognese Sauce', 'g', 'Kitchen Savory', 130, 27),
  ('beef_slice', 'Beef Slice', 'g', 'Kitchen Savory', 320, 28),
  ('kimchi', 'Kimchi', 'g', 'Kitchen Savory', 70, 29),
  ('lettuce', 'Lettuce', 'g', 'Fresh Produce', 40, 30),
  ('tomato', 'Tomato', 'g', 'Fresh Produce', 35, 31);

INSERT INTO ingredients (id, name, unit, category_id)
SELECT
  gen_random_uuid(),
  s.name,
  s.unit,
  c.id
FROM seed_ingredient_specs s
JOIN tmp_inventory_categories c ON c.name = s.category_name;

CREATE TEMP TABLE tmp_ingredients AS
SELECT
  i.id,
  s.ingredient_code,
  s.name,
  s.unit,
  s.unit_cost,
  s.ingredient_index
FROM ingredients i
JOIN seed_ingredient_specs s ON s.name = i.name;

CREATE TEMP TABLE seed_product_categories (
  category_name TEXT PRIMARY KEY
);

INSERT INTO seed_product_categories (category_name)
VALUES
  ('Coffee'),
  ('Tea'),
  ('Ice Blended'),
  ('Bakery'),
  ('Kitchen');

INSERT INTO product_categories (id, name)
SELECT gen_random_uuid(), category_name
FROM seed_product_categories;

CREATE TEMP TABLE tmp_product_categories AS
SELECT id, name
FROM product_categories
WHERE name IN (SELECT category_name FROM seed_product_categories);

CREATE TEMP TABLE seed_product_templates (
  product_code TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  station TEXT NOT NULL,
  product_index INTEGER NOT NULL
);

INSERT INTO seed_product_templates (product_code, sku, name, category_name, base_price, station, product_index)
VALUES
  ('espresso', 'ESPRESSO', 'Espresso', 'Coffee', 32000, 'bar', 1),
  ('americano', 'AMERICANO', 'Americano', 'Coffee', 38000, 'bar', 2),
  ('latte', 'LATTE', 'Latte', 'Coffee', 45000, 'bar', 3),
  ('cappuccino', 'CAPPUCCINO', 'Cappuccino', 'Coffee', 45000, 'bar', 4),
  ('bacxiu', 'BACXIU', 'Bac Xiu', 'Coffee', 42000, 'bar', 5),
  ('caphesuada', 'CAPHE_SUA_DA', 'Ca Phe Sua Da', 'Coffee', 39000, 'bar', 6),
  ('tradao', 'TRA_DAO', 'Tra Dao Cam Sa', 'Tea', 44000, 'bar', 7),
  ('travai', 'TRA_VAI', 'Tra Vai Nhai', 'Tea', 46000, 'bar', 8),
  ('milktea', 'MILK_TEA', 'Hong Tra Sua Tran Chau', 'Tea', 48000, 'bar', 9),
  ('matchalatte', 'MATCHA_LATTE', 'Matcha Latte', 'Tea', 49000, 'bar', 10),
  ('chocolateblend', 'CHOCO_BLEND', 'Chocolate Da Xay', 'Ice Blended', 52000, 'bar', 11),
  ('mangoyogurt', 'MANGO_YOGURT', 'Mango Yogurt Smoothie', 'Ice Blended', 54000, 'bar', 12),
  ('passionsoda', 'PASSION_SODA', 'Passion Fruit Soda', 'Ice Blended', 42000, 'bar', 13),
  ('croissant', 'CROISSANT', 'Butter Croissant', 'Bakery', 32000, 'pastry', 14),
  ('tiramisu', 'TIRAMISU', 'Tiramisu Slice', 'Bakery', 46000, 'pastry', 15),
  ('chickensandwich', 'CHICKEN_SANDWICH', 'Chicken Sandwich', 'Kitchen', 58000, 'kitchen', 16),
  ('breakfastwrap', 'BREAKFAST_WRAP', 'Breakfast Wrap', 'Kitchen', 62000, 'kitchen', 17),
  ('ricebowl', 'RICE_BOWL', 'Chicken Rice Bowl', 'Kitchen', 72000, 'kitchen', 18),
  ('spaghetti', 'SPAGHETTI_BOLO', 'Spaghetti Bolognese', 'Kitchen', 78000, 'kitchen', 19),
  ('beefbowl', 'BEEF_BOWL', 'Beef Kimchi Bowl', 'Kitchen', 89000, 'kitchen', 20);

INSERT INTO products (
  id,
  branch_id,
  category_id,
  sku,
  name,
  price,
  image_url,
  metadata,
  created_at,
  is_active
)
SELECT
  gen_random_uuid(),
  b.id,
  pc.id,
  p.sku,
  p.name,
  p.base_price + b.price_delta,
  NULL,
  jsonb_build_object(
    'station', p.station,
    'product_code', p.product_code,
    'menu_group', p.category_name
  ),
  TIMESTAMPTZ '2026-03-26 09:00:00+07',
  TRUE
FROM tmp_branches b
CROSS JOIN seed_product_templates p
JOIN tmp_product_categories pc ON pc.name = p.category_name;

CREATE TEMP TABLE tmp_products AS
SELECT
  pr.id,
  pr.branch_id,
  b.branch_code,
  p.product_code,
  p.product_index,
  pr.sku,
  pr.name,
  pr.price
FROM products pr
JOIN tmp_branches b ON b.id = pr.branch_id
JOIN seed_product_templates p ON p.sku = pr.sku;

CREATE TEMP TABLE tmp_table_specs AS
SELECT
  b.id AS branch_id,
  b.branch_code,
  gs AS table_no,
  'T' || lpad(gs::TEXT, 2, '0') AS table_name
FROM tmp_branches b
CROSS JOIN generate_series(1, 12) AS gs;

INSERT INTO tables (id, branch_id, name, status)
SELECT gen_random_uuid(), branch_id, table_name, 'AVAILABLE'
FROM tmp_table_specs;

CREATE TEMP TABLE tmp_tables AS
SELECT
  t.id,
  s.branch_id,
  s.branch_code,
  s.table_no,
  t.name
FROM tables t
JOIN tmp_table_specs s
  ON s.branch_id = t.branch_id
 AND s.table_name = t.name;

CREATE TEMP TABLE seed_user_specs (
  username TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  role_name TEXT NOT NULL,
  branch_code TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO seed_user_specs (username, full_name, position, role_name, branch_code, phone, created_at)
VALUES
  ('admin', 'System Admin', 'Super Admin', 'Super Admin', NULL, '0901000000', TIMESTAMPTZ '2026-03-24 08:00:00+07'),
  ('area_ops', 'Area Operations Lead', 'Area Manager', 'Area Manager', NULL, '0901000001', TIMESTAMPTZ '2026-03-24 08:10:00+07'),
  ('mgr_mydinh', 'Manager My Dinh', 'Branch Manager', 'Branch Manager', 'mydinh', '0901100001', TIMESTAMPTZ '2026-03-25 08:00:00+07'),
  ('inv_mydinh', 'Inventory My Dinh', 'Inventory Staff', 'Inventory Staff', 'mydinh', '0901100002', TIMESTAMPTZ '2026-03-25 08:05:00+07'),
  ('cashier1_mydinh', 'Cashier 1 My Dinh', 'Cashier', 'Cashier', 'mydinh', '0901100003', TIMESTAMPTZ '2026-03-25 08:10:00+07'),
  ('cashier2_mydinh', 'Cashier 2 My Dinh', 'Cashier', 'Cashier', 'mydinh', '0901100004', TIMESTAMPTZ '2026-03-25 08:15:00+07'),
  ('barista1_mydinh', 'Barista 1 My Dinh', 'Barista', 'Barista', 'mydinh', '0901100005', TIMESTAMPTZ '2026-03-25 08:20:00+07'),
  ('barista2_mydinh', 'Barista 2 My Dinh', 'Barista', 'Barista', 'mydinh', '0901100006', TIMESTAMPTZ '2026-03-25 08:25:00+07'),
  ('mgr_caugiay', 'Manager Cau Giay', 'Branch Manager', 'Branch Manager', 'caugiay', '0901200001', TIMESTAMPTZ '2026-03-25 08:00:00+07'),
  ('inv_caugiay', 'Inventory Cau Giay', 'Inventory Staff', 'Inventory Staff', 'caugiay', '0901200002', TIMESTAMPTZ '2026-03-25 08:05:00+07'),
  ('cashier1_caugiay', 'Cashier 1 Cau Giay', 'Cashier', 'Cashier', 'caugiay', '0901200003', TIMESTAMPTZ '2026-03-25 08:10:00+07'),
  ('cashier2_caugiay', 'Cashier 2 Cau Giay', 'Cashier', 'Cashier', 'caugiay', '0901200004', TIMESTAMPTZ '2026-03-25 08:15:00+07'),
  ('barista1_caugiay', 'Barista 1 Cau Giay', 'Barista', 'Barista', 'caugiay', '0901200005', TIMESTAMPTZ '2026-03-25 08:20:00+07'),
  ('barista2_caugiay', 'Barista 2 Cau Giay', 'Barista', 'Barista', 'caugiay', '0901200006', TIMESTAMPTZ '2026-03-25 08:25:00+07'),
  ('mgr_haibatrung', 'Manager Hai Ba Trung', 'Branch Manager', 'Branch Manager', 'haibatrung', '0901300001', TIMESTAMPTZ '2026-03-25 08:00:00+07'),
  ('inv_haibatrung', 'Inventory Hai Ba Trung', 'Inventory Staff', 'Inventory Staff', 'haibatrung', '0901300002', TIMESTAMPTZ '2026-03-25 08:05:00+07'),
  ('cashier1_haibatrung', 'Cashier 1 Hai Ba Trung', 'Cashier', 'Cashier', 'haibatrung', '0901300003', TIMESTAMPTZ '2026-03-25 08:10:00+07'),
  ('cashier2_haibatrung', 'Cashier 2 Hai Ba Trung', 'Cashier', 'Cashier', 'haibatrung', '0901300004', TIMESTAMPTZ '2026-03-25 08:15:00+07'),
  ('barista1_haibatrung', 'Barista 1 Hai Ba Trung', 'Barista', 'Barista', 'haibatrung', '0901300005', TIMESTAMPTZ '2026-03-25 08:20:00+07'),
  ('barista2_haibatrung', 'Barista 2 Hai Ba Trung', 'Barista', 'Barista', 'haibatrung', '0901300006', TIMESTAMPTZ '2026-03-25 08:25:00+07'),
  ('mgr_phunhuan', 'Manager Phu Nhuan', 'Branch Manager', 'Branch Manager', 'phunhuan', '0901400001', TIMESTAMPTZ '2026-03-25 08:00:00+07'),
  ('inv_phunhuan', 'Inventory Phu Nhuan', 'Inventory Staff', 'Inventory Staff', 'phunhuan', '0901400002', TIMESTAMPTZ '2026-03-25 08:05:00+07'),
  ('cashier1_phunhuan', 'Cashier 1 Phu Nhuan', 'Cashier', 'Cashier', 'phunhuan', '0901400003', TIMESTAMPTZ '2026-03-25 08:10:00+07'),
  ('cashier2_phunhuan', 'Cashier 2 Phu Nhuan', 'Cashier', 'Cashier', 'phunhuan', '0901400004', TIMESTAMPTZ '2026-03-25 08:15:00+07'),
  ('barista1_phunhuan', 'Barista 1 Phu Nhuan', 'Barista', 'Barista', 'phunhuan', '0901400005', TIMESTAMPTZ '2026-03-25 08:20:00+07'),
  ('barista2_phunhuan', 'Barista 2 Phu Nhuan', 'Barista', 'Barista', 'phunhuan', '0901400006', TIMESTAMPTZ '2026-03-25 08:25:00+07'),
  ('mgr_thaodien', 'Manager Thao Dien', 'Branch Manager', 'Branch Manager', 'thaodien', '0901500001', TIMESTAMPTZ '2026-03-25 08:00:00+07'),
  ('inv_thaodien', 'Inventory Thao Dien', 'Inventory Staff', 'Inventory Staff', 'thaodien', '0901500002', TIMESTAMPTZ '2026-03-25 08:05:00+07'),
  ('cashier1_thaodien', 'Cashier 1 Thao Dien', 'Cashier', 'Cashier', 'thaodien', '0901500003', TIMESTAMPTZ '2026-03-25 08:10:00+07'),
  ('cashier2_thaodien', 'Cashier 2 Thao Dien', 'Cashier', 'Cashier', 'thaodien', '0901500004', TIMESTAMPTZ '2026-03-25 08:15:00+07'),
  ('barista1_thaodien', 'Barista 1 Thao Dien', 'Barista', 'Barista', 'thaodien', '0901500005', TIMESTAMPTZ '2026-03-25 08:20:00+07'),
  ('barista2_thaodien', 'Barista 2 Thao Dien', 'Barista', 'Barista', 'thaodien', '0901500006', TIMESTAMPTZ '2026-03-25 08:25:00+07');

INSERT INTO users (id, username, password_hash, is_active, created_at)
SELECT
  gen_random_uuid(),
  s.username,
  crypt(
    CASE WHEN s.username = 'admin' THEN 'admin123' ELSE 'seed123' END,
    gen_salt('bf', 10)
  ),
  TRUE,
  s.created_at
FROM seed_user_specs s;

CREATE TEMP TABLE tmp_users AS
SELECT
  u.id,
  s.username,
  s.full_name,
  s.position,
  s.role_name,
  s.branch_code,
  s.phone,
  s.created_at
FROM users u
JOIN seed_user_specs s ON s.username = u.username;

INSERT INTO employees (id, user_id, branch_id, full_name, phone, position, created_at)
SELECT
  gen_random_uuid(),
  u.id,
  b.id,
  u.full_name,
  u.phone,
  u.position,
  u.created_at
FROM tmp_users u
LEFT JOIN tmp_branches b ON b.branch_code = u.branch_code;

CREATE TEMP TABLE tmp_employees AS
SELECT
  e.id,
  e.user_id,
  e.branch_id,
  e.full_name,
  e.position,
  u.username,
  u.role_name,
  u.branch_code
FROM employees e
JOIN tmp_users u ON u.id = e.user_id;

INSERT INTO user_roles (user_id, role_id)
SELECT
  u.id,
  r.id
FROM tmp_users u
JOIN tmp_roles r ON r.name = u.role_name;

INSERT INTO user_branch_access (user_id, branch_id, created_at)
SELECT
  u.id,
  b.id,
  u.created_at
FROM tmp_users u
JOIN tmp_branches b
  ON u.branch_code = b.branch_code
   OR u.branch_code IS NULL;

CREATE TEMP TABLE tmp_branch_staff AS
SELECT
  b.id AS branch_id,
  b.branch_code,
  b.branch_index,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('mgr_%s', b.branch_code)))::UUID AS manager_user_id,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('inv_%s', b.branch_code)))::UUID AS inventory_user_id,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('cashier1_%s', b.branch_code)))::UUID AS cashier1_user_id,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('cashier2_%s', b.branch_code)))::UUID AS cashier2_user_id,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('barista1_%s', b.branch_code)))::UUID AS barista1_user_id,
  (MIN(u.id::TEXT) FILTER (WHERE u.username = format('barista2_%s', b.branch_code)))::UUID AS barista2_user_id
FROM tmp_branches b
LEFT JOIN tmp_users u ON u.branch_code = b.branch_code
GROUP BY b.id, b.branch_code, b.branch_index;

CREATE TEMP TABLE seed_recipes (
  product_code TEXT NOT NULL,
  ingredient_code TEXT NOT NULL,
  qty_per_item NUMERIC(12,3) NOT NULL
);

INSERT INTO seed_recipes (product_code, ingredient_code, qty_per_item)
VALUES
  ('espresso', 'coffee_beans', 18),
  ('americano', 'coffee_beans', 18),
  ('latte', 'coffee_beans', 18),
  ('latte', 'fresh_milk', 180),
  ('cappuccino', 'coffee_beans', 18),
  ('cappuccino', 'fresh_milk', 160),
  ('bacxiu', 'coffee_beans', 14),
  ('bacxiu', 'fresh_milk', 120),
  ('bacxiu', 'condensed_milk', 35),
  ('caphesuada', 'coffee_beans', 20),
  ('caphesuada', 'condensed_milk', 30),
  ('tradao', 'black_tea', 10),
  ('tradao', 'peach_syrup', 35),
  ('tradao', 'sugar_syrup', 20),
  ('travai', 'jasmine_tea', 10),
  ('travai', 'lychee_syrup', 40),
  ('travai', 'sugar_syrup', 15),
  ('milktea', 'black_tea', 8),
  ('milktea', 'fresh_milk', 120),
  ('milktea', 'milk_tea_powder', 25),
  ('milktea', 'tapioca_pearls', 60),
  ('matchalatte', 'matcha_powder', 18),
  ('matchalatte', 'fresh_milk', 180),
  ('matchalatte', 'sugar_syrup', 15),
  ('chocolateblend', 'chocolate_powder', 28),
  ('chocolateblend', 'fresh_milk', 160),
  ('chocolateblend', 'sugar_syrup', 15),
  ('mangoyogurt', 'yogurt', 120),
  ('mangoyogurt', 'mango_puree', 80),
  ('mangoyogurt', 'sugar_syrup', 10),
  ('passionsoda', 'passion_puree', 45),
  ('passionsoda', 'soda_water', 180),
  ('passionsoda', 'sugar_syrup', 10),
  ('croissant', 'croissant_piece', 1),
  ('tiramisu', 'tiramisu_slice', 1),
  ('chickensandwich', 'sandwich_bread', 2),
  ('chickensandwich', 'chicken_filling', 90),
  ('chickensandwich', 'lettuce', 15),
  ('chickensandwich', 'tomato', 20),
  ('breakfastwrap', 'wrap_sheet', 1),
  ('breakfastwrap', 'sausage_piece', 1),
  ('breakfastwrap', 'egg_piece', 1),
  ('breakfastwrap', 'lettuce', 10),
  ('breakfastwrap', 'tomato', 15),
  ('ricebowl', 'rice_cooked', 250),
  ('ricebowl', 'grilled_chicken', 120),
  ('ricebowl', 'lettuce', 20),
  ('spaghetti', 'spaghetti_portion', 1),
  ('spaghetti', 'bolognese_sauce', 140),
  ('beefbowl', 'rice_cooked', 240),
  ('beefbowl', 'beef_slice', 110),
  ('beefbowl', 'kimchi', 60);

CREATE TEMP TABLE seed_baskets (
  basket_code TEXT PRIMARY KEY,
  daypart TEXT NOT NULL,
  preferred_order_type TEXT NOT NULL,
  basket_rank INTEGER NOT NULL
);

INSERT INTO seed_baskets (basket_code, daypart, preferred_order_type, basket_rank)
VALUES
  ('M01', 'MORNING', 'TAKE_AWAY', 1),
  ('M02', 'MORNING', 'DINE_IN', 2),
  ('M03', 'MORNING', 'TAKEAWAY', 3),
  ('M04', 'MORNING', 'DINE_IN', 4),
  ('M05', 'MORNING', 'DELIVERY', 5),
  ('M06', 'MORNING', 'TAKE_AWAY', 6),
  ('L01', 'MIDDAY', 'DINE_IN', 1),
  ('L02', 'MIDDAY', 'DINE_IN', 2),
  ('L03', 'MIDDAY', 'DELIVERY', 3),
  ('L04', 'MIDDAY', 'TAKE_AWAY', 4),
  ('L05', 'MIDDAY', 'DINE_IN', 5),
  ('L06', 'MIDDAY', 'DELIVERY', 6),
  ('A01', 'AFTERNOON', 'TAKE_AWAY', 1),
  ('A02', 'AFTERNOON', 'DINE_IN', 2),
  ('A03', 'AFTERNOON', 'DELIVERY', 3),
  ('A04', 'AFTERNOON', 'TAKEAWAY', 4),
  ('A05', 'AFTERNOON', 'DINE_IN', 5),
  ('A06', 'AFTERNOON', 'TAKE_AWAY', 6),
  ('E01', 'EVENING', 'DINE_IN', 1),
  ('E02', 'EVENING', 'DINE_IN', 2),
  ('E03', 'EVENING', 'DELIVERY', 3),
  ('E04', 'EVENING', 'TAKE_AWAY', 4),
  ('E05', 'EVENING', 'DINE_IN', 5),
  ('E06', 'EVENING', 'DELIVERY', 6);

CREATE TEMP TABLE seed_basket_items (
  basket_code TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  product_code TEXT NOT NULL,
  quantity INTEGER NOT NULL
);

INSERT INTO seed_basket_items (basket_code, line_no, product_code, quantity)
VALUES
  ('M01', 1, 'caphesuada', 1),
  ('M02', 1, 'latte', 1),
  ('M02', 2, 'croissant', 1),
  ('M03', 1, 'americano', 1),
  ('M03', 2, 'croissant', 1),
  ('M04', 1, 'bacxiu', 1),
  ('M04', 2, 'breakfastwrap', 1),
  ('M05', 1, 'caphesuada', 2),
  ('M05', 2, 'croissant', 1),
  ('M06', 1, 'matchalatte', 1),
  ('M06', 2, 'tiramisu', 1),
  ('L01', 1, 'chickensandwich', 1),
  ('L01', 2, 'tradao', 1),
  ('L02', 1, 'ricebowl', 1),
  ('L02', 2, 'passionsoda', 1),
  ('L03', 1, 'spaghetti', 1),
  ('L03', 2, 'travai', 1),
  ('L03', 3, 'tiramisu', 1),
  ('L04', 1, 'beefbowl', 1),
  ('L04', 2, 'mangoyogurt', 1),
  ('L05', 1, 'milktea', 1),
  ('L05', 2, 'chickensandwich', 1),
  ('L06', 1, 'ricebowl', 2),
  ('L06', 2, 'passionsoda', 2),
  ('A01', 1, 'milktea', 1),
  ('A01', 2, 'tiramisu', 1),
  ('A02', 1, 'matchalatte', 1),
  ('A02', 2, 'croissant', 1),
  ('A03', 1, 'tradao', 2),
  ('A03', 2, 'chickensandwich', 1),
  ('A04', 1, 'mangoyogurt', 1),
  ('A04', 2, 'tiramisu', 1),
  ('A05', 1, 'chocolateblend', 1),
  ('A05', 2, 'tiramisu', 1),
  ('A06', 1, 'cappuccino', 1),
  ('A06', 2, 'croissant', 2),
  ('E01', 1, 'beefbowl', 1),
  ('E01', 2, 'travai', 1),
  ('E02', 1, 'spaghetti', 1),
  ('E02', 2, 'chocolateblend', 1),
  ('E03', 1, 'chickensandwich', 2),
  ('E03', 2, 'passionsoda', 2),
  ('E04', 1, 'ricebowl', 1),
  ('E04', 2, 'milktea', 1),
  ('E05', 1, 'beefbowl', 1),
  ('E05', 2, 'matchalatte', 1),
  ('E05', 3, 'tiramisu', 1),
  ('E06', 1, 'caphesuada', 2),
  ('E06', 2, 'croissant', 1),
  ('E06', 3, 'tiramisu', 1);

CREATE TEMP TABLE tmp_baskets AS
SELECT
  basket_code,
  daypart,
  preferred_order_type,
  basket_rank,
  ROW_NUMBER() OVER (PARTITION BY daypart ORDER BY basket_rank) AS basket_idx,
  COUNT(*) OVER (PARTITION BY daypart) AS daypart_count
FROM seed_baskets;

CREATE TEMP TABLE tmp_service_days AS
SELECT
  gs::DATE AS service_date,
  EXTRACT(DAY FROM gs)::INTEGER AS day_num,
  EXTRACT(ISODOW FROM gs)::INTEGER AS iso_dow
FROM generate_series(DATE '2026-04-01', DATE '2026-04-30', INTERVAL '1 day') AS gs;

CREATE TEMP TABLE tmp_daily_branch_orders AS
SELECT
  b.branch_id,
  b.branch_code,
  b.branch_index,
  d.service_date,
  d.day_num,
  d.iso_dow,
  LEAST(
    25,
    20
      + ((d.day_num + b.branch_index) % 4)
      + CASE WHEN d.iso_dow IN (6, 7) THEN 2 ELSE 0 END
      + CASE WHEN d.day_num IN (5, 15, 25) THEN 1 ELSE 0 END
  ) AS order_count
FROM tmp_branch_staff b
CROSS JOIN tmp_service_days d;

CREATE TEMP TABLE tmp_order_stage AS
WITH expanded AS (
  SELECT
    d.*,
    gs AS order_seq
  FROM tmp_daily_branch_orders d
  CROSS JOIN LATERAL generate_series(1, d.order_count) AS gs
),
timed AS (
  SELECT
    e.*,
    CASE
      WHEN e.order_seq <= 5 THEN 'MORNING'
      WHEN e.order_seq <= 11 THEN 'MIDDAY'
      WHEN e.order_seq <= 17 THEN 'AFTERNOON'
      ELSE 'EVENING'
    END AS daypart,
    CASE
      WHEN e.order_seq <= 5 THEN
        (
          e.service_date::TIMESTAMP
          + TIME '07:00'
          + make_interval(mins => ((e.order_seq * 23 + e.branch_index * 11 + e.day_num * 3) % 150))
        ) AT TIME ZONE 'Asia/Saigon'
      WHEN e.order_seq <= 11 THEN
        (
          e.service_date::TIMESTAMP
          + TIME '11:00'
          + make_interval(mins => ((e.order_seq * 19 + e.branch_index * 7 + e.day_num * 5) % 180))
        ) AT TIME ZONE 'Asia/Saigon'
      WHEN e.order_seq <= 17 THEN
        (
          e.service_date::TIMESTAMP
          + TIME '14:30'
          + make_interval(mins => ((e.order_seq * 17 + e.branch_index * 13 + e.day_num * 7) % 180))
        ) AT TIME ZONE 'Asia/Saigon'
      ELSE
        (
          e.service_date::TIMESTAMP
          + TIME '18:00'
          + make_interval(mins => ((e.order_seq * 13 + e.branch_index * 17 + e.day_num * 11) % 210))
        ) AT TIME ZONE 'Asia/Saigon'
    END AS created_at
  FROM expanded e
)
SELECT
  gen_random_uuid() AS order_id,
  t.branch_id,
  t.branch_code,
  t.branch_index,
  t.service_date,
  t.day_num,
  t.iso_dow,
  t.order_seq,
  t.daypart,
  b.basket_code,
  b.preferred_order_type AS order_type,
  CASE
    WHEN b.preferred_order_type = 'DINE_IN' THEN tb.id
    ELSE NULL
  END AS table_id,
  CASE
    WHEN t.order_seq % 9 = 0 THEN s.manager_user_id
    WHEN t.order_seq % 2 = 0 THEN s.cashier1_user_id
    ELSE s.cashier2_user_id
  END AS created_by,
  format('ODR-%s-%s-%s', upper(t.branch_code), to_char(t.service_date, 'YYYYMMDD'), lpad(t.order_seq::TEXT, 3, '0')) AS order_code,
  CASE
    WHEN b.preferred_order_type = 'DELIVERY' THEN format('APP-%s-%s-%s', upper(t.branch_code), to_char(t.service_date, 'MMDD'), lpad(t.order_seq::TEXT, 3, '0'))
    ELSE NULL
  END AS client_id,
  CASE
    WHEN b.preferred_order_type = 'DELIVERY' THEN
      jsonb_build_object(
        'channel', CASE WHEN (t.order_seq + t.branch_index) % 2 = 0 THEN 'SHOPPEE_FOOD' ELSE 'GRAB_FOOD' END,
        'daypart', t.daypart
      )
    WHEN b.preferred_order_type = 'DINE_IN' THEN
      jsonb_build_object('channel', 'WALK_IN', 'daypart', t.daypart)
    ELSE
      jsonb_build_object('channel', 'PICK_UP', 'daypart', t.daypart)
  END AS metadata,
  t.created_at
FROM timed t
JOIN tmp_branch_staff s ON s.branch_id = t.branch_id
JOIN tmp_baskets b
  ON b.daypart = t.daypart
 AND b.basket_idx = ((t.order_seq + t.branch_index + t.day_num) % b.daypart_count) + 1
LEFT JOIN tmp_tables tb
  ON tb.branch_id = t.branch_id
 AND tb.table_no = ((t.order_seq + t.day_num + t.branch_index) % 12) + 1;

INSERT INTO orders (
  id,
  branch_id,
  client_id,
  created_by,
  order_code,
  order_type,
  table_id,
  order_status,
  payment_status,
  total_amount,
  metadata,
  created_at,
  updated_at
)
SELECT
  o.order_id,
  o.branch_id,
  o.client_id,
  o.created_by,
  o.order_code,
  o.order_type,
  o.table_id,
  'CLOSED',
  'PAID',
  0,
  o.metadata,
  o.created_at,
  o.created_at + INTERVAL '12 minutes'
FROM tmp_order_stage o;

CREATE TEMP TABLE tmp_order_items_stage AS
SELECT
  gen_random_uuid() AS item_id,
  o.order_id,
  p.id AS product_id,
  p.name,
  bi.quantity,
  p.price AS unit_price,
  (bi.quantity * p.price)::NUMERIC(12,2) AS subtotal,
  o.created_at + make_interval(mins => bi.line_no) AS item_created_at
FROM tmp_order_stage o
JOIN seed_basket_items bi ON bi.basket_code = o.basket_code
JOIN tmp_products p
  ON p.branch_id = o.branch_id
 AND p.product_code = bi.product_code;

INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price, subtotal, created_at)
SELECT
  item_id,
  order_id,
  product_id,
  name,
  quantity,
  unit_price,
  subtotal,
  item_created_at
FROM tmp_order_items_stage;

CREATE TEMP TABLE tmp_order_totals AS
SELECT
  order_id,
  SUM(subtotal)::NUMERIC(12,2) AS total_amount
FROM tmp_order_items_stage
GROUP BY order_id;

UPDATE orders o
SET
  total_amount = t.total_amount,
  updated_at = o.created_at + INTERVAL '15 minutes'
FROM tmp_order_totals t
WHERE o.id = t.order_id;

CREATE TEMP TABLE tmp_payment_stage AS
SELECT
  o.order_id,
  o.order_code,
  o.order_type,
  o.branch_code,
  o.branch_index,
  o.day_num,
  o.order_seq,
  o.created_at + INTERVAL '5 minutes' AS payment_created_at,
  t.total_amount,
  CASE
    WHEN o.order_type = 'DELIVERY' AND o.order_seq % 2 = 0 THEN 'MOMO'
    WHEN o.order_type = 'DELIVERY' THEN 'BANK_TRANSFER'
    WHEN o.order_type = 'DINE_IN' AND o.order_seq % 5 = 0 THEN 'MOMO'
    WHEN o.order_type = 'DINE_IN' AND o.order_seq % 3 = 0 THEN 'CARD'
    WHEN o.order_type IN ('TAKE_AWAY', 'TAKEAWAY') AND o.order_seq % 4 = 0 THEN 'CARD'
    ELSE 'CASH'
  END AS payment_method
FROM tmp_order_stage o
JOIN tmp_order_totals t ON t.order_id = o.order_id;

INSERT INTO payments (id, order_id, amount, payment_method, provider_metadata, created_at)
SELECT
  gen_random_uuid(),
  p.order_id,
  p.total_amount,
  p.payment_method,
  CASE
    WHEN p.payment_method = 'CASH' THEN NULL
    ELSE jsonb_build_object(
      'reference', format('%s-%s', p.order_code, p.payment_method),
      'settled', TRUE
    )
  END,
  p.payment_created_at
FROM tmp_payment_stage p;

INSERT INTO e_invoices (id, branch_id, order_id, provider, status, external_id, payload, response, issued_at, created_at)
SELECT
  gen_random_uuid(),
  o.branch_id,
  o.order_id,
  'VNPT_INVOICE',
  'ISSUED',
  format('INV-%s', o.order_code),
  jsonb_build_object(
    'order_code', o.order_code,
    'order_type', o.order_type,
    'branch', o.branch_code
  ),
  jsonb_build_object(
    'status', 'SUCCESS',
    'issued_by', 'seed_migration'
  ),
  p.payment_created_at,
  p.payment_created_at
FROM tmp_order_stage o
JOIN tmp_payment_stage p ON p.order_id = o.order_id
WHERE o.order_type = 'DELIVERY'
   OR ((o.order_seq + o.branch_index + o.day_num) % 5 = 0);

CREATE TEMP TABLE tmp_consumption AS
SELECT
  o.branch_id,
  o.service_date,
  i.id AS ingredient_id,
  i.ingredient_code,
  i.unit_cost,
  SUM(oi.quantity * r.qty_per_item)::NUMERIC(12,3) AS quantity
FROM tmp_order_stage o
JOIN tmp_order_items_stage oi ON oi.order_id = o.order_id
JOIN tmp_products p ON p.id = oi.product_id
JOIN seed_recipes r ON r.product_code = p.product_code
JOIN tmp_ingredients i ON i.ingredient_code = r.ingredient_code
GROUP BY
  o.branch_id,
  o.service_date,
  i.id,
  i.ingredient_code,
  i.unit_cost;

INSERT INTO inventory_transactions (
  id,
  branch_id,
  ingredient_id,
  order_id,
  quantity,
  unit_cost,
  transaction_type,
  reason,
  created_by,
  created_at
)
SELECT
  gen_random_uuid(),
  c.branch_id,
  c.ingredient_id,
  NULL,
  c.quantity,
  c.unit_cost,
  'OUT',
  format('DAILY_SALES_%s', to_char(c.service_date, 'YYYYMMDD')),
  s.inventory_user_id,
  (c.service_date::TIMESTAMP + TIME '22:10') AT TIME ZONE 'Asia/Saigon'
FROM tmp_consumption c
JOIN tmp_branch_staff s ON s.branch_id = c.branch_id;

CREATE TEMP TABLE tmp_total_out AS
SELECT
  c.branch_id,
  c.ingredient_id,
  c.ingredient_code,
  i.unit,
  i.unit_cost,
  SUM(c.quantity)::NUMERIC(12,3) AS total_out
FROM tmp_consumption c
JOIN tmp_ingredients i ON i.id = c.ingredient_id
GROUP BY
  c.branch_id,
  c.ingredient_id,
  c.ingredient_code,
  i.unit,
  i.unit_cost;

CREATE TEMP TABLE seed_receipt_dates (
  receipt_index INTEGER PRIMARY KEY,
  receipt_date DATE NOT NULL
);

INSERT INTO seed_receipt_dates (receipt_index, receipt_date)
VALUES
  (1, DATE '2026-04-01'),
  (2, DATE '2026-04-08'),
  (3, DATE '2026-04-15'),
  (4, DATE '2026-04-22'),
  (5, DATE '2026-04-29');

CREATE TEMP TABLE tmp_receipt_plan AS
SELECT
  t.branch_id,
  t.ingredient_id,
  t.ingredient_code,
  t.unit,
  t.unit_cost,
  CASE
    WHEN t.unit IN ('piece', 'portion') THEN
      CEIL(
        t.total_out * 1.12
        + CASE
            WHEN t.unit = 'piece' THEN 24
            WHEN t.unit = 'portion' THEN 18
            ELSE 10
          END
      )::NUMERIC(12,3)
    ELSE
      ROUND(
        t.total_out * 1.12
        + CASE
            WHEN t.unit = 'ml' THEN 1500
            WHEN t.unit = 'g' THEN 1000
            ELSE 10
          END,
        3
      )
  END AS planned_in
FROM tmp_total_out t;

CREATE TEMP TABLE tmp_receipt_stage AS
SELECT
  p.branch_id,
  p.ingredient_id,
  p.unit,
  p.unit_cost,
  d.receipt_index,
  d.receipt_date,
  CASE d.receipt_index
    WHEN 1 THEN CASE WHEN p.unit IN ('piece', 'portion') THEN ROUND(p.planned_in * 0.40, 0) ELSE ROUND(p.planned_in * 0.40, 3) END
    WHEN 2 THEN CASE WHEN p.unit IN ('piece', 'portion') THEN ROUND(p.planned_in * 0.15, 0) ELSE ROUND(p.planned_in * 0.15, 3) END
    WHEN 3 THEN CASE WHEN p.unit IN ('piece', 'portion') THEN ROUND(p.planned_in * 0.15, 0) ELSE ROUND(p.planned_in * 0.15, 3) END
    WHEN 4 THEN CASE WHEN p.unit IN ('piece', 'portion') THEN ROUND(p.planned_in * 0.15, 0) ELSE ROUND(p.planned_in * 0.15, 3) END
    ELSE CASE
      WHEN p.unit IN ('piece', 'portion') THEN ROUND(
        p.planned_in
        - ROUND(p.planned_in * 0.40, 0)
        - ROUND(p.planned_in * 0.15, 0)
        - ROUND(p.planned_in * 0.15, 0)
        - ROUND(p.planned_in * 0.15, 0),
        0
      )
      ELSE ROUND(
        p.planned_in
        - ROUND(p.planned_in * 0.40, 3)
        - ROUND(p.planned_in * 0.15, 3)
        - ROUND(p.planned_in * 0.15, 3)
        - ROUND(p.planned_in * 0.15, 3),
        3
      )
    END
  END AS quantity
FROM tmp_receipt_plan p
CROSS JOIN seed_receipt_dates d;

INSERT INTO inventory_transactions (
  id,
  branch_id,
  ingredient_id,
  order_id,
  quantity,
  unit_cost,
  transaction_type,
  reason,
  created_by,
  created_at
)
SELECT
  gen_random_uuid(),
  r.branch_id,
  r.ingredient_id,
  NULL,
  r.quantity,
  r.unit_cost,
  'IN',
  CASE
    WHEN r.receipt_index = 1 THEN 'OPENING_STOCK'
    ELSE format('WEEKLY_RESTOCK_W%s', r.receipt_index - 1)
  END,
  s.inventory_user_id,
  (r.receipt_date::TIMESTAMP + CASE WHEN r.receipt_index = 1 THEN TIME '05:45' ELSE TIME '06:30' END) AT TIME ZONE 'Asia/Saigon'
FROM tmp_receipt_stage r
JOIN tmp_branch_staff s ON s.branch_id = r.branch_id;

CREATE TEMP TABLE tmp_stocktakes AS
SELECT
  gen_random_uuid() AS stocktake_id,
  s.branch_id,
  s.branch_code,
  s.manager_user_id,
  s.inventory_user_id
FROM tmp_branch_staff s;

INSERT INTO stocktakes (
  id,
  branch_id,
  status,
  note,
  created_by,
  approved_by,
  created_at,
  approved_at
)
SELECT
  st.stocktake_id,
  st.branch_id,
  'APPROVED',
  'Month end stock count for April 2026',
  st.inventory_user_id,
  st.manager_user_id,
  TIMESTAMPTZ '2026-04-30 22:40:00+07',
  TIMESTAMPTZ '2026-04-30 23:05:00+07'
FROM tmp_stocktakes st;

CREATE TEMP TABLE tmp_on_hand_before_stocktake AS
SELECT
  it.branch_id,
  it.ingredient_id,
  COALESCE(SUM(
    CASE
      WHEN it.transaction_type = 'IN' THEN it.quantity
      WHEN it.transaction_type = 'OUT' THEN -it.quantity
      WHEN it.transaction_type = 'ADJUST' THEN it.quantity
      ELSE 0
    END
  ), 0)::NUMERIC(12,3) AS system_qty
FROM inventory_transactions it
GROUP BY it.branch_id, it.ingredient_id;

CREATE TEMP TABLE tmp_stocktake_items_stage AS
SELECT
  gen_random_uuid() AS stocktake_item_id,
  st.stocktake_id,
  st.branch_id,
  oh.ingredient_id,
  oh.system_qty,
  GREATEST(
    0,
    oh.system_qty
    + CASE
        WHEN ing.unit IN ('ml', 'g') THEN ((br.branch_index + ing.ingredient_index) % 5 - 2) * CASE WHEN ing.unit = 'ml' THEN 25 ELSE 15 END
        WHEN ing.unit IN ('piece', 'portion') THEN ((br.branch_index + ing.ingredient_index) % 3 - 1)
        ELSE 0
      END
  )::NUMERIC(12,3) AS actual_qty
FROM tmp_stocktakes st
JOIN tmp_branches br ON br.id = st.branch_id
JOIN tmp_on_hand_before_stocktake oh ON oh.branch_id = st.branch_id
JOIN tmp_ingredients ing ON ing.id = oh.ingredient_id;

INSERT INTO stocktake_items (
  id,
  stocktake_id,
  ingredient_id,
  system_qty,
  actual_qty,
  delta_qty
)
SELECT
  s.stocktake_item_id,
  s.stocktake_id,
  s.ingredient_id,
  s.system_qty,
  s.actual_qty,
  (s.actual_qty - s.system_qty)::NUMERIC(12,3)
FROM tmp_stocktake_items_stage s;

INSERT INTO inventory_transactions (
  id,
  branch_id,
  ingredient_id,
  order_id,
  quantity,
  unit_cost,
  transaction_type,
  reason,
  created_by,
  created_at
)
SELECT
  gen_random_uuid(),
  s.branch_id,
  s.ingredient_id,
  NULL,
  (s.actual_qty - s.system_qty)::NUMERIC(12,3),
  NULL,
  'ADJUST',
  format('STOCKTAKE:%s', s.stocktake_id),
  st.manager_user_id,
  TIMESTAMPTZ '2026-04-30 23:05:00+07'
FROM tmp_stocktake_items_stage s
JOIN tmp_stocktakes st ON st.stocktake_id = s.stocktake_id
WHERE (s.actual_qty - s.system_qty) <> 0;

CREATE TEMP TABLE tmp_attendance_staff AS
SELECT
  e.id AS employee_id,
  e.branch_id,
  b.branch_code,
  b.branch_index,
  e.username,
  e.position,
  CASE
    WHEN e.username LIKE 'mgr_%' THEN 1
    WHEN e.username LIKE 'inv_%' THEN 2
    WHEN e.username LIKE 'cashier1_%' THEN 3
    WHEN e.username LIKE 'cashier2_%' THEN 4
    WHEN e.username LIKE 'barista1_%' THEN 5
    ELSE 6
  END AS staff_slot
FROM tmp_employees e
JOIN tmp_branches b ON b.id = e.branch_id
WHERE e.username LIKE 'mgr_%'
   OR e.username LIKE 'inv_%'
   OR e.username LIKE 'cashier1_%'
   OR e.username LIKE 'cashier2_%'
   OR e.username LIKE 'barista1_%'
   OR e.username LIKE 'barista2_%';

CREATE TEMP TABLE tmp_attendance_stage AS
SELECT
  gen_random_uuid() AS attendance_id,
  s.employee_id,
  s.branch_id,
  s.branch_index,
  s.staff_slot,
  d.service_date,
  d.day_num,
  CASE
    WHEN s.username LIKE 'mgr_%' THEN 'Morning'
    WHEN s.username LIKE 'inv_%' THEN 'Morning'
    WHEN s.username LIKE 'cashier1_%' OR s.username LIKE 'barista1_%' THEN CASE WHEN d.day_num % 2 = 1 THEN 'Morning' ELSE 'Evening' END
    ELSE CASE WHEN d.day_num % 2 = 1 THEN 'Evening' ELSE 'Morning' END
  END AS shift_name,
  CASE
    WHEN s.username LIKE 'mgr_%' THEN d.iso_dow BETWEEN 1 AND 6
    WHEN s.username LIKE 'inv_%' THEN d.iso_dow BETWEEN 1 AND 6
    ELSE ((d.day_num + s.staff_slot + s.branch_index) % 7) <> 0
  END AS is_working
FROM tmp_attendance_staff s
CROSS JOIN tmp_service_days d;

INSERT INTO attendance (id, employee_id, shift_id, check_in, check_out, branch_id)
SELECT
  a.attendance_id,
  a.employee_id,
  sh.id,
  (
    a.service_date::TIMESTAMP
    + sh.start_time
    + make_interval(mins => ((a.day_num + a.staff_slot + a.branch_index + EXTRACT(HOUR FROM sh.start_time)::INTEGER) % 9) - 4)
  ) AT TIME ZONE 'Asia/Saigon',
  (
    a.service_date::TIMESTAMP
    + sh.end_time
    + make_interval(mins => ((a.day_num + a.staff_slot + a.branch_index + EXTRACT(HOUR FROM sh.end_time)::INTEGER) % 11) - 5)
  ) AT TIME ZONE 'Asia/Saigon',
  a.branch_id
FROM tmp_attendance_stage a
JOIN tmp_shifts sh ON sh.name = a.shift_name
WHERE a.is_working = TRUE;
