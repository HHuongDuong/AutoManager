-- Migration: 003_einvoice.sql
-- Electronic invoice settings and issuance tracking

CREATE TABLE IF NOT EXISTS e_invoice_settings (
  branch_id UUID PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  provider TEXT,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS e_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id),
  order_id UUID REFERENCES orders(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  external_id TEXT,
  payload JSONB,
  response JSONB,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_e_invoices_branch_created ON e_invoices(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_e_invoices_order ON e_invoices(order_id);
