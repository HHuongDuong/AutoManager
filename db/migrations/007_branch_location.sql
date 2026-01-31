-- Migration: 007_branch_location.sql
-- Add latitude/longitude to branches for attendance geofencing

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);
