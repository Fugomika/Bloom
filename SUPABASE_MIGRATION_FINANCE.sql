-- Adds the Finance feature to an existing Bloom database.
-- Run once in Supabase SQL Editor. Safe to run even if already applied.

CREATE TABLE IF NOT EXISTS finance_transactions (
  id       TEXT PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type     TEXT NOT NULL DEFAULT 'expense',
  amount   NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other_exp',
  note     TEXT DEFAULT '',
  date     TEXT NOT NULL,
  at       BIGINT NOT NULL
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own finance_transactions" ON finance_transactions;
CREATE POLICY "own finance_transactions" ON finance_transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS finance_budgets JSONB DEFAULT '{}';

UPDATE settings
SET visible_sections = visible_sections || ARRAY['finance']
WHERE NOT ('finance' = ANY(visible_sections));
