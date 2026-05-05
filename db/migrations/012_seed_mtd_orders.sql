-- Migration: 012_seed_mtd_orders.sql
-- Append month-to-date orders (2026-04-01 to 2026-05-05)

-- Seed orders for April 2026 to May 5, 2026
CREATE TEMP TABLE seed_orders_012 (
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
  FROM generate_series('2026-04-01'::date, '2026-05-05'::date, '1 day') AS gs
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
INSERT INTO seed_orders_012 (day, seq, branch_id, branch_code, order_code, client_id, order_type, table_id, created_by, created_at, updated_at, is_paid)
SELECT
  ob.day,
  ob.seq,
  ob.branch_id,
  ob.branch_code,
  CONCAT('OD-', TO_CHAR(ob.day, 'YYYYMMDD'), '-', ob.branch_code, '-', ob.seq),
  CONCAT('POS-', ob.branch_code, '-', TO_CHAR(ob.day, 'YYYYMMDD'), '-', ob.seq),
  CASE
    WHEN ob.seq % 6 = 0 THEN 'DELIVERY'
    WHEN ob.seq % 2 = 1 THEN 'DINE_IN'
    ELSE 'TAKEAWAY'
  END,
  CASE
    WHEN ob.seq % 2 = 1 AND ob.seq % 6 != 0 THEN (
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
  (ob.day + time '08:00' + (ob.seq * interval '10 minutes') + interval '25 minutes')::timestamptz,
  CASE WHEN ob.seq % 8 = 0 THEN FALSE ELSE TRUE END
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
FROM seed_orders_012 s
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
  (1 + (s.seq % 4))::int,
  p.price,
  (1 + (s.seq % 4)) * p.price,
  (o.created_at + interval '3 minutes')::timestamptz
FROM seed_orders_012 s
JOIN orders o ON o.order_code = s.order_code
JOIN LATERAL (
  SELECT id, name, price
  FROM product_list
  WHERE branch_id = s.branch_id
    AND rn IN (
      ((s.seq + EXTRACT(day FROM s.day)::int) % 8) + 1,
      ((s.seq + 3 + EXTRACT(day FROM s.day)::int) % 8) + 1,
      ((s.seq + 5) % 8) + 1
    )
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
JOIN seed_orders_012 s ON s.order_code = o.order_code
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
JOIN seed_orders_012 s ON s.order_code = o.order_code
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
JOIN seed_orders_012 s ON s.order_code = o.order_code
WHERE s.is_paid = TRUE
  AND EXTRACT(day FROM s.day)::int % 5 = 0
  AND NOT EXISTS (SELECT 1 FROM e_invoices e WHERE e.order_id = o.id);

-- Inventory transactions (IN deliveries every 5 days)
WITH deliver_days AS (
  SELECT gs::date AS day
  FROM generate_series('2026-04-01'::date, '2026-05-05'::date, '5 day') AS gs
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
JOIN seed_orders_012 s ON s.order_code = o.order_code
JOIN LATERAL (
  SELECT id FROM ingredients ORDER BY name LIMIT 1 OFFSET (s.seq % 5)
) ing ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_transactions t WHERE t.order_id = o.id AND t.transaction_type = 'OUT'
);

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
JOIN seed_orders_012 s ON s.order_code = o.order_code
WHERE s.is_paid = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs al WHERE al.request_id = CONCAT('req-pay-', o.order_code)
  );

DROP TABLE seed_orders_012;
