-- Migration: 009_add_audit_permission.sql
-- Add AUDIT_VIEW permission and grant to Super Admin role if present

WITH perm AS (
  INSERT INTO permissions (id, code, description)
  VALUES (gen_random_uuid(), 'AUDIT_VIEW', 'Xem audit logs')
  ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
  RETURNING id
), role_row AS (
  SELECT id FROM roles WHERE name = 'Super Admin'
), perm_row AS (
  SELECT id FROM permissions WHERE code = 'AUDIT_VIEW'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_row.id, perm_row.id
FROM role_row, perm_row
ON CONFLICT DO NOTHING;
