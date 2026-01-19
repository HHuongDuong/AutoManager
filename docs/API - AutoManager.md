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

- GET /orders/{order_id}
  - Response 200: full order with items, payments, statuses.

- PATCH /orders/{order_id}
  - Purpose: update mutable fields (e.g., add item, change status) while preserving idempotency semantics.
  - Body: partial order fields (items as diffs or complete replacement depending on API mode).

- POST /orders/batch-sync
  - Mục đích: endpoint dành cho Sync Agent gửi batch orders when reconnecting.
  - Body: { "orders": [<order payload as above>], "client_id": "string" }
  - Response: per-order result list with mapping { client_id -> server_id, status }

## Payments

- POST /orders/{order_id}/payments
  - Body: { "amount": 100.00, "payment_method": "CASH|CARD|QR|WALLET|OTHER", "provider_metadata": { } }
  - Response 201: payment record
  - Note: current implementation supports `CASH` only; other methods are accepted but adapter not implemented.

## Products & Catalog

- GET /products?branch_id={id}
  - Response 200: list of products (cached by clients)

- POST /products (admin)
  - Create / update / delete endpoints require RBAC (role: manager/admin).

## Inventory

- GET /inventory/transactions?branch_id={id}&from=&to=
  - Response: list of transactions

- POST /inventory/transactions
  - Body: { "branch_id": "uuid", "ingredient_id": "uuid", "order_id": "uuid|null", "quantity": 1.0, "transaction_type": "IN|OUT|ADJUST", "reason": "string" }

## Users / Staff

- GET /users/{id}
- POST /users
- PATCH /users/{id}
- Endpoints require RBAC; audit logs created for CRUD ops.

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
