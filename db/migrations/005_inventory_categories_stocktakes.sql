-- Migration: 005_inventory_categories_stocktakes.sql
-- Add inventory categories and stocktake reconciliation

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory_categories(id);

CREATE TABLE IF NOT EXISTS stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  note TEXT,
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_stocktakes_branch_created ON stocktakes(branch_id, created_at);

CREATE TABLE IF NOT EXISTS stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID REFERENCES stocktakes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  system_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  actual_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  delta_qty NUMERIC(12,3) NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stocktake_items_unique ON stocktake_items(stocktake_id, ingredient_id);
