-- Migration: 004_product_images_branch_prices.sql
-- Add product image URL and branch-specific prices

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS product_branch_prices (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY(product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_product_branch_prices_branch ON product_branch_prices(branch_id, product_id);
