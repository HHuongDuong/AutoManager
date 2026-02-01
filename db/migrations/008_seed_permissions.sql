-- Migration: 008_seed_permissions.sql
-- Seed system permissions

INSERT INTO permissions (id, code, description)
VALUES
  (gen_random_uuid(), 'RBAC_MANAGE', 'Quản lý phân quyền'),
  (gen_random_uuid(), 'EINVOICE_MANAGE', 'Quản lý hóa đơn điện tử'),
  (gen_random_uuid(), 'ORDERS_READ', 'Xem/định dạng in hóa đơn'),
  (gen_random_uuid(), 'ORDERS_CREATE', 'Tạo đơn hàng'),
  (gen_random_uuid(), 'ORDERS_VIEW', 'Xem đơn hàng'),
  (gen_random_uuid(), 'ORDERS_UPDATE', 'Cập nhật đơn hàng'),
  (gen_random_uuid(), 'ORDERS_PAY', 'Thanh toán đơn hàng'),
  (gen_random_uuid(), 'TABLE_VIEW', 'Xem bàn'),
  (gen_random_uuid(), 'TABLE_MANAGE', 'Quản lý bàn'),
  (gen_random_uuid(), 'EMPLOYEE_VIEW', 'Xem nhân viên'),
  (gen_random_uuid(), 'EMPLOYEE_MANAGE', 'Quản lý nhân viên'),
  (gen_random_uuid(), 'PRODUCT_VIEW', 'Xem sản phẩm'),
  (gen_random_uuid(), 'PRODUCT_MANAGE', 'Quản lý sản phẩm'),
  (gen_random_uuid(), 'INVENTORY_VIEW', 'Xem kho'),
  (gen_random_uuid(), 'INVENTORY_MANAGE', 'Quản lý kho'),
  (gen_random_uuid(), 'REPORT_VIEW', 'Xem báo cáo'),
  (gen_random_uuid(), 'ATTENDANCE_VIEW', 'Xem chấm công'),
  (gen_random_uuid(), 'ATTENDANCE_MANAGE', 'Quản lý chấm công'),
  (gen_random_uuid(), 'AI_USE', 'Sử dụng AI')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;
