# API & Contracts — AutoManager POS

Tài liệu này mô tả các endpoint API lõi, headers, payload mẫu, idempotency và các mã lỗi chính. Mọi endpoint đều yêu cầu `Authorization: Bearer <JWT>` trừ khi ghi chú khác.

## Authentication

- POST /auth/login
  - Body: { "username": "string", "password": "string" }
  - Response 200: { "access_token": "<jwt>", "expires_in": 3600 }

## Headers chung
- `Authorization`: `Bearer <token>`
- `Idempotency-Key`: client-generated key (khi gửi POST có thể gây duplicate)
- `X-Client-Id`: client device id (optional, used for offline sync mapping)

## Orders

- POST /orders
  - Mục đích: tạo order (sử dụng cả khi online từ POS client hoặc qua Sync Agent).
  - Required headers: `Idempotency-Key` recommended, `X-Client-Id` optional.
  - Body (JSON):
    {
      "client_id": "string",          // local temporary id
      "branch_id": "uuid",
      "created_by": "uuid",
      "order_type": "DINE_IN|TAKEAWAY",
      "table_id": "uuid|null",
      "items": [
        { "product_id": "uuid", "name": "string", "quantity": 1, "unit_price": 9.5, "toppings": [{"id":"uuid","price":1.0}] }
      ],
      "payments": [ { "amount": 100, "payment_method": "CASH" } ],
      "metadata": { }
    }
  - Response 201: created order object with server `id`, canonical `order_code`, and `created_at`.
  - Behavior: server uses `Idempotency-Key` to dedupe; if duplicate, returns existing order (200) or 409 if conflict cannot be resolved.
  - RBAC: `ORDERS_CREATE`

- GET /orders/{order_id}
  - Response 200: full order with items, payments, statuses.
  - RBAC: `ORDERS_VIEW`

- GET /orders
  - Query: `branch_id`, `from`, `to`
  - RBAC: `ORDERS_VIEW`

- PATCH /orders/{order_id}
  - Purpose: update mutable fields (e.g., add item, change status) while preserving idempotency semantics.
  - Body: partial order fields (items as diffs or complete replacement depending on API mode).

- POST /orders/{order_id}/items
  - RBAC: `ORDERS_UPDATE`
  - Add item to order

- PATCH /orders/{order_id}/items/{item_id}
  - RBAC: `ORDERS_UPDATE`
  - Update item quantity/price

- DELETE /orders/{order_id}/items/{item_id}
  - RBAC: `ORDERS_UPDATE`
  - Remove item

- POST /orders/batch-sync
  - Mục đích: endpoint dành cho Sync Agent gửi batch orders when reconnecting.
  - Body: { "orders": [<order payload as above>], "client_id": "string" }
  - Response: per-order result list with mapping { client_id -> server_id, status }

## Payments

- POST /orders/{order_id}/payments
  - Body: { "amount": 100.00, "payment_method": "CASH|CARD|QR|WALLET|OTHER", "provider_metadata": { } }
  - Response 201: payment record
  - Note: current implementation supports `CASH` only; other methods are accepted but adapter not implemented.
  - RBAC: `ORDERS_PAY`

- POST /orders/{order_id}/close
  - RBAC: `ORDERS_UPDATE`
  - Closes order if `payment_status` is `PAID`

## Products & Catalog

- GET /products?branch_id={id}
  - Response 200: list of products (cached by clients)

- POST /products (admin)
  - Create / update / delete endpoints require RBAC (role: manager/admin).

- GET /product-categories
  - RBAC: `PRODUCT_VIEW`

- POST /product-categories
  - RBAC: `PRODUCT_MANAGE`
  - Body: { "name": "string" }

- PATCH /products/{id}
  - RBAC: `PRODUCT_MANAGE`

- DELETE /products/{id}
  - RBAC: `PRODUCT_MANAGE`

- GET /topping-groups
  - RBAC: `PRODUCT_VIEW`

- POST /topping-groups
  - RBAC: `PRODUCT_MANAGE`

- GET /toppings?group_id={id}
  - RBAC: `PRODUCT_VIEW`

- POST /toppings
  - RBAC: `PRODUCT_MANAGE`

- POST /products/{id}/toppings
  - RBAC: `PRODUCT_MANAGE`

## Inventory

- GET /inventory/transactions?branch_id={id}&from=&to=
  - Response: list of transactions

- POST /inventory/transactions
  - Body: { "branch_id": "uuid", "ingredient_id": "uuid", "order_id": "uuid|null", "quantity": 1.0, "transaction_type": "IN|OUT|ADJUST", "reason": "string" }
  - RBAC: `INVENTORY_MANAGE`

- GET /inventory/inputs?branch_id={id}&ingredient_id=&from=&to=
  - Mục đích: danh sách nhập kho (IN) theo nguyên liệu
  - RBAC: `INVENTORY_VIEW`

- POST /inventory/inputs
  - Mục đích: nhập kho nguyên liệu (không cần nhà cung cấp)
  - RBAC: `INVENTORY_MANAGE`
  - Body: { "branch_id": "uuid", "reason": "string", "items": [{"ingredient_id":"uuid","quantity":1,"unit_cost":10}] }

- POST /inventory/receipts
  - RBAC: `INVENTORY_MANAGE`
  - Body: { "branch_id": "uuid", "reason": "string", "items": [{"ingredient_id":"uuid","quantity":1,"unit_cost":10}] }

- POST /inventory/issues
  - RBAC: `INVENTORY_MANAGE`
  - Body: { "branch_id": "uuid", "reason": "string", "items": [{"ingredient_id":"uuid","quantity":1}] }

- POST /inventory/adjustments
  - RBAC: `INVENTORY_MANAGE`
  - Body: { "branch_id": "uuid", "reason": "string", "items": [{"ingredient_id":"uuid","quantity":-1}] }

- GET /ingredients
  - RBAC: `INVENTORY_VIEW`

- POST /ingredients
  - RBAC: `INVENTORY_MANAGE`
  - Body: { "name": "string", "unit": "string" }

- PATCH /ingredients/{id}
  - RBAC: `INVENTORY_MANAGE`

- DELETE /ingredients/{id}
  - RBAC: `INVENTORY_MANAGE`

## Reports & analytics

- GET /reports/revenue?branch_id=&from=&to=&group_by=day|month
  - RBAC: `REPORT_VIEW`
  - Returns bucketed revenue and order counts

- GET /reports/inventory?branch_id=&ingredient_id=&from=&to=
  - RBAC: `REPORT_VIEW`
  - Returns aggregated inventory movements

- GET /reports/attendance?branch_id=&from=&to=
  - RBAC: `REPORT_VIEW`
  - Returns total hours by employee

## AI (optional)

- POST /ai/forecast
  - RBAC: `AI_USE`
  - Body: { "series": [1,2,3], "horizon": 7, "method": "moving_average", "window": 7 }
  - Response: { "forecast": [..], "method": "moving_average" }

- POST /ai/suggest-reorder
  - RBAC: `AI_USE`
  - Body: { "branch_id": "uuid", "items": [{"ingredient_id":"uuid","on_hand":10,"series":[5,6,7]}] }
  - Response: suggested reorder quantities per ingredient

## Users / Staff

- GET /users/{id}
- POST /users
- PATCH /users/{id}
- Endpoints require RBAC; audit logs created for CRUD ops.

## Employees

- GET /employees
  - Requires permission: `EMPLOYEE_VIEW`
  - Response: list of employees with linked user info

- GET /employees/{id}
  - Requires permission: `EMPLOYEE_VIEW`
  - Response: employee detail

- POST /employees
  - Requires permission: `EMPLOYEE_MANAGE`
  - Body: { "username": "string", "password": "string", "branch_id": "uuid", "full_name": "string", "phone": "string", "position": "string" }
  - Creates user + employee profile

- PATCH /employees/{id}
  - Requires permission: `EMPLOYEE_MANAGE`
  - Body: { "full_name": "string", "phone": "string", "position": "string", "branch_id": "uuid" }

- DELETE /employees/{id}
  - Requires permission: `EMPLOYEE_MANAGE`

- PATCH /users/{id}/status
  - Requires permission: `EMPLOYEE_MANAGE`
  - Body: { "is_active": true|false }

## Attendance & Shifts

- GET /shifts
  - RBAC: `ATTENDANCE_VIEW`

- POST /shifts
  - RBAC: `ATTENDANCE_MANAGE`
  - Body: { "name": "string", "start_time": "HH:MM", "end_time": "HH:MM" }

- POST /attendance/checkin
  - RBAC: `ATTENDANCE_MANAGE`
  - Body: { "employee_id": "uuid", "shift_id": "uuid" }

- POST /attendance/checkout
  - RBAC: `ATTENDANCE_MANAGE`
  - Body: { "employee_id": "uuid" }

## Tables (Quản lý bàn)

- GET /tables?branch_id=
  - RBAC: `TABLE_VIEW`

- POST /tables
  - RBAC: `TABLE_MANAGE`
  - Body: { "branch_id": "uuid", "name": "Table 1", "status": "AVAILABLE|OCCUPIED" }

- PATCH /tables/{id}
  - RBAC: `TABLE_MANAGE`

- DELETE /tables/{id}
  - RBAC: `TABLE_MANAGE`

- PATCH /tables/{id}/status
  - RBAC: `TABLE_MANAGE`
  - Body: { "status": "AVAILABLE|OCCUPIED" }

## Audit logs

- GET /audit-logs?user_id=&action=&from=&to=&limit=
  - RBAC: `AUDIT_VIEW`

## Sync-specific contract details

- Idempotency
  - Clients MUST send `Idempotency-Key` for create operations originating from offline clients.
  - Server stores `idempotency_key` with TTL (e.g., 24h) and returns existing resource if a duplicate key is detected.

- Conflict handling
  - If server cannot auto-merge (e.g., conflicting payments), response uses 409 with body { "error": "conflict", "details": [...] } and client must surface for user review.

- Batch sync
  - Use `/orders/batch-sync` to reduce chattiness. Server returns mapping array: [{ "client_id": "c123", "server_id": "<uuid>", "status": "created|conflict|error", "error": {...} }]

## Error model

- 400 Bad Request — validation error (body contains `errors` array)
- 401 Unauthorized — missing/invalid JWT
- 403 Forbidden — RBAC violation
- 404 Not Found — resource missing
- 409 Conflict — idempotency conflict or business rule conflict
- 429 Too Many Requests — rate limiting
- 500 Internal Server Error — unexpected

Error response example:
{
  "status": 400,
  "error": "validation_error",
  "errors": [ { "field": "items[0].product_id", "message": "required" } ]
}

## Security & rate-limiting

- All endpoints require TLS. Use JWT with short expiry and refresh tokens.
- Rate-limit write endpoints per client (e.g., 10 req/sec) and employ IP-based and user-based limits.

## Recommendations for implementers

- Persist `idempotency_key` and `X-Client-Id` mapping for at least 24h.
- Keep create-order transaction scope small: insert order, insert items, insert payments, publish event.
- Validate totals server-side (sum(items) == total_amount) to prevent tampering.

---
Generated API spec (overview). For full OpenAPI spec, I can produce a `openapi.yaml` next — muốn tôi tạo OpenAPI definition không?
