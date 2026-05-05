-- Migration: 013_fix_seed_prices_vnd.sql
-- Fix seed prices to VND scale and update seeded orders/revenue (April-May 2026)

-- Update product prices (VND)
UPDATE products
SET price = CASE sku
  WHEN 'DT-PHO-01' THEN 45000
  WHEN 'DT-BUN-01' THEN 42000
  WHEN 'DT-COM-01' THEN 40000
  WHEN 'DT-BMI-01' THEN 25000
  WHEN 'DT-TRA-01' THEN 5000
  WHEN 'DT-CAFE-01' THEN 18000
  WHEN 'DT-ORANGE-01' THEN 22000
  WHEN 'DT-CHE-01' THEN 20000
  WHEN 'RV-PHO-01' THEN 47000
  WHEN 'RV-BUN-01' THEN 44000
  WHEN 'RV-COM-01' THEN 41000
  WHEN 'RV-BMI-01' THEN 26000
  WHEN 'RV-TRA-01' THEN 5000
  WHEN 'RV-CAFE-01' THEN 19000
  WHEN 'RV-ORANGE-01' THEN 23000
  WHEN 'RV-CHE-01' THEN 21000
  ELSE price
END
WHERE sku IN (
  'DT-PHO-01','DT-BUN-01','DT-COM-01','DT-BMI-01','DT-TRA-01','DT-CAFE-01','DT-ORANGE-01','DT-CHE-01',
  'RV-PHO-01','RV-BUN-01','RV-COM-01','RV-BMI-01','RV-TRA-01','RV-CAFE-01','RV-ORANGE-01','RV-CHE-01'
);

-- Update branch-specific prices to match new VND scale
UPDATE product_branch_prices pbp
SET price = p.price * 0.95,
    updated_at = now()
FROM products p
WHERE pbp.product_id = p.id
  AND p.sku IN (
    'DT-PHO-01','DT-BUN-01','DT-CAFE-01',
    'RV-PHO-01','RV-BUN-01','RV-CAFE-01'
  );

-- Update order items for seeded orders
UPDATE order_items oi
SET unit_price = p.price,
    subtotal = p.price * oi.quantity
FROM orders o, products p
WHERE oi.order_id = o.id
  AND oi.product_id = p.id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05'
  AND p.sku IN (
    'DT-PHO-01','DT-BUN-01','DT-COM-01','DT-BMI-01','DT-TRA-01','DT-CAFE-01','DT-ORANGE-01','DT-CHE-01',
    'RV-PHO-01','RV-BUN-01','RV-COM-01','RV-BMI-01','RV-TRA-01','RV-CAFE-01','RV-ORANGE-01','RV-CHE-01'
  );

-- Recalculate order totals for seeded orders
UPDATE orders o
SET total_amount = t.total,
    updated_at = GREATEST(o.updated_at, now())
FROM (
  SELECT order_id, SUM(subtotal) AS total
  FROM order_items
  GROUP BY order_id
) t
WHERE o.id = t.order_id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05';

-- Update payments for seeded orders
UPDATE payments p
SET amount = o.total_amount
FROM orders o
WHERE p.order_id = o.id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05';

-- Update e-invoice payload amounts for seeded orders
UPDATE e_invoices e
SET payload = jsonb_set(COALESCE(e.payload, '{}'::jsonb), '{amount}', to_jsonb(o.total_amount), true)
FROM orders o
WHERE e.order_id = o.id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05';

-- Update audit logs payload totals for seeded orders
UPDATE audit_logs a
SET payload = jsonb_set(COALESCE(a.payload, '{}'::jsonb), '{total}', to_jsonb(o.total_amount), true)
FROM orders o
WHERE a.action = 'ORDER_CREATE'
  AND a.object_id = o.id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05';

UPDATE audit_logs a
SET payload = jsonb_set(COALESCE(a.payload, '{}'::jsonb), '{amount}', to_jsonb(o.total_amount), true)
FROM orders o
WHERE a.action = 'ORDER_PAY'
  AND a.object_id = o.id
  AND o.order_code LIKE 'OD-%'
  AND o.created_at::date BETWEEN '2026-04-01' AND '2026-05-05';
