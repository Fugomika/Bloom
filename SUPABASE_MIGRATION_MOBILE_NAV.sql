-- Adds the mobile bottom-nav "quick sections" config to an existing Bloom database.
-- Run once in Supabase SQL Editor. Safe to run even if already applied.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS mobile_nav_sections TEXT[] DEFAULT ARRAY['tasks','habits','calories'];
