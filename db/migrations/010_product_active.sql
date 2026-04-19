-- Migration: 010_product_active.sql
-- Add soft-delete flag for products

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
