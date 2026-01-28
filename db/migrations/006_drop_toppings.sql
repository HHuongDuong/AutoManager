-- Migration: 006_drop_toppings.sql
-- Remove topping-related tables/columns

ALTER TABLE order_items
  DROP COLUMN IF EXISTS toppings;

DROP TABLE IF EXISTS product_toppings;
DROP TABLE IF EXISTS toppings;
DROP TABLE IF EXISTS topping_groups;
