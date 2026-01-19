# Kiến trúc cao cấp — AutoManager POS

Tài liệu này mô tả kiến trúc tổng quan, ranh giới dịch vụ, luồng dữ liệu chính, thiết kế offline/local-sync, yêu cầu hiệu năng và hướng triển khai cho hệ thống AutoManager POS.

## Mục tiêu
- Hỗ trợ bán hàng tại quầy nhanh (latency < 1s) và hoạt động offline cơ bản.
- Thiết kế module hóa, dễ mở rộng (multi-branch, payment providers mở rộng).
- Triển khai local-first, có thể mở rộng lên cloud.

## Thành phần chính (Service Boundaries)

- POS Desktop (Electron)
  - UI bán hàng, cache local, queue thao tác khi offline, Sync Agent.
- Web Dashboard (React/Next.js)
  - Quản lý sản phẩm, nhân viên, báo cáo.
- Mobile App (Flutter / React Native)
  - Check-in/checkout, xem ca làm.
- Backend API (Node.js / NestJS hoặc Express)
  - Auth Service (JWT, bcrypt)
  - POS Service (orders, tables)
  - Inventory Service (ingredients, transactions)
  - Staff & Attendance Service
  - Report Service
  - Sync Service / Conflict Resolver
- Data Stores
  - PostgreSQL: chính cho transactional data
  - Redis: cache, distributed locks, rate-limit
  - Object store (S3) cho backup off-site
- Infrastructure
  - Queue (RabbitMQ / Redis Streams) cho các tác vụ background (sync, reports)
  - Monitoring (Prometheus + Grafana)
  - Logging (centralized log — ELK/Opensearch)

## Luồng dữ liệu chính: tạo đơn (offline-capable)

1. POS UI tạo order -> ghi vào local DB (IndexedDB/SQLite) và trả response nhanh cho UI.
2. Order được push vào local queue (FIFO) của Sync Agent.
3. Khi có kết nối, Sync Agent gửi order tới Backend POS Service qua API `/orders`.
4. Backend xác thực, tạo transactional record, trả về server-assigned id và trạng thái. Nếu có conflict (ví dụ duplicate id), backend trả conflict error; client sẽ reconcile (merge hoặc user review).
5. Backend ghi audit log và đẩy message vào queue để các service liên quan xử lý (inventory transaction, report update).

Ghi chú: Mỗi order local cần chứa a) client_id (local temp id), b) created_at, c) branch_id, d) retry metadata.

## Thiết kế offline / sync

- Local store: chọn SQLite cho Electron, IndexedDB cho web PWA; schema subset của order và product cache.
- Sync Agent: chịu trách nhiệm retry/backoff, idempotency (idempotency-key), và conflict detection.
- Conflict strategy: prefer server-authoritative for order ids; cho phép merge nếu metadata khác (ví dụ thanh toán trạng thái). Đối với trạng thái kho, yêu cầu manual adjustment (do hệ thống không tự trừ kho khi bán).

## Multi-branch & tenancy

- Data model: thêm `branch_id` trên các bảng chính (`orders`, `inventory_transactions`, `products`, `users` nếu cần phân quyền theo chi nhánh).
- Triển khai mặc định: single-db, logical partition bằng `branch_id`. Option: multi-tenant DB khi cần isolation.

## Concurrency & hiệu năng

- Baseline: thiết kế chịu K = 50 concurrent POS clients (tùy chỉnh cấu hình).
- Tối ưu endpoint bán hàng: connection pooling, prepared statements, small transaction scopes.
- Chỉ số quan trọng: p95 latency API tạo đơn < 1s; DB connections >= expected concurrency * 2.
- Cache: product catalog in Redis; static configs cached on client.

## Backup, retention & SLA

- Backup strategy: full daily backup + continuous WAL archiving; weekly off-site copy to S3.
- Test restore: monthly restore drill.
- Retention: audit logs giữ 1 năm; backup retention policy configurable.
- SLA đề xuất cho deployment cloud/local-managed: target 99.9% uptime; RTO <=1h, RPO <=15m (tùy hợp đồng).

## Payment abstraction

- Store `payment_method` enum on `payments` (CASH, CARD, QR, WALLET, OTHER) and design extensible `payment_records` table to attach provider metadata.
- Current scope: implement `CASH` only; add provider adapter interface for future integrations.

## Database & schema notes

- PostgreSQL: use transactions for order creation; create indices on `orders(branch_id, created_at)`, `order_items(order_id)`, `products(branch_id, id)`.
- Use materialized views for heavy reports (sales per day) and refresh-as-needed or via background job.

## Deployment & scaling

- Local-first mode: backend can be run on an on-premise server inside store LAN; POS clients connect to local backend for lowest latency.
- Cloud mode: backend hosted on VPS or k8s; use managed Postgres and object storage.
- Recommend containerization (Docker) for all services.

## Observability

- Metrics: request latency, DB connections, queue depth, sync failures per client.
- Logs: centralized audit logs + app logs; retain audit logs per retention policy.

## Tech stack (recommend)

- Backend: Node.js (TypeScript) + NestJS/Express
- DB: PostgreSQL
- Cache: Redis
- Queue: RabbitMQ / Redis Streams
- POS Desktop: Electron + React
- Web Dashboard: React (Next.js)
- Mobile: Flutter or React Native

## Next steps (implementable tasks)
- Create ERD and detailed schema for `orders`, `order_items`, `payments`, `inventory_transactions`.
- Define API contract for `/orders` (incl. idempotency-key, branch_id, client_id).
- Implement Sync Agent prototype for Electron POS.
- Create deployment manifests (Docker Compose + k8s templates).

---
Generated: Architecture - AutoManager
