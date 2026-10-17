-- Adds the Books feature (reading tracker, collection, yearly goals) to an existing Bloom database.
-- Run once in Supabase SQL Editor. Safe to run even if already applied.

CREATE TABLE IF NOT EXISTS books (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL DEFAULT '',
  author         TEXT DEFAULT '',
  cover_url      TEXT DEFAULT '',
  source_key     TEXT DEFAULT '',
  isbn           TEXT DEFAULT '',
  pages          INTEGER DEFAULT 0,
  published_year INTEGER,
  genres         TEXT[] DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'want',
  rating         INTEGER DEFAULT 0,
  review         TEXT DEFAULT '',
  started_at     TEXT DEFAULT '',
  finished_at    TEXT DEFAULT '',
  owned          BOOLEAN DEFAULT false,
  format         TEXT DEFAULT 'physical',
  location       TEXT DEFAULT '',
  lent_to        TEXT DEFAULT '',
  quotes         JSONB DEFAULT '[]',
  at             BIGINT NOT NULL
);

-- One row per user per year
CREATE TABLE IF NOT EXISTS reading_goals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year    INTEGER NOT NULL,
  target  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year)
);

ALTER TABLE books         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own books" ON books;
CREATE POLICY "own books" ON books FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own reading_goals" ON reading_goals;
CREATE POLICY "own reading_goals" ON reading_goals FOR ALL USING (auth.uid() = user_id);

UPDATE settings
SET visible_sections = visible_sections || ARRAY['books']
WHERE NOT ('books' = ANY(visible_sections));
