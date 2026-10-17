-- Adds the Wardrobe feature (clothes, outfits, photo storage) to an existing Bloom database.
-- Run once in Supabase SQL Editor. Safe to run even if already applied.

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT 'other',
  colors         TEXT[] DEFAULT '{}',
  brand          TEXT DEFAULT '',
  size           TEXT DEFAULT '',
  seasons        TEXT[] DEFAULT '{}',
  tags           TEXT[] DEFAULT '{}',
  price          NUMERIC DEFAULT 0,
  bought_date    TEXT DEFAULT '',
  image_path     TEXT DEFAULT '',
  note           TEXT DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'active',
  archive_reason TEXT DEFAULT '',
  archived_at    BIGINT,
  finance_tx_id  TEXT,
  at             BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS wardrobe_outfits (
  id       TEXT PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL DEFAULT '',
  item_ids TEXT[] DEFAULT '{}',
  tags     TEXT[] DEFAULT '{}',
  note     TEXT DEFAULT '',
  favorite BOOLEAN DEFAULT false,
  at       BIGINT NOT NULL
);

ALTER TABLE wardrobe_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own wardrobe_items" ON wardrobe_items;
CREATE POLICY "own wardrobe_items" ON wardrobe_items FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own wardrobe_outfits" ON wardrobe_outfits;
CREATE POLICY "own wardrobe_outfits" ON wardrobe_outfits FOR ALL USING (auth.uid() = user_id);

-- ── Photo storage: private bucket, each user only touches {uid}/... ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('wardrobe', 'wardrobe', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "wardrobe own select" ON storage.objects;
DROP POLICY IF EXISTS "wardrobe own insert" ON storage.objects;
DROP POLICY IF EXISTS "wardrobe own update" ON storage.objects;
DROP POLICY IF EXISTS "wardrobe own delete" ON storage.objects;

CREATE POLICY "wardrobe own select" ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "wardrobe own delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'wardrobe' AND auth.uid()::text = (storage.foldername(name))[1]);

UPDATE settings
SET visible_sections = visible_sections || ARRAY['wardrobe']
WHERE NOT ('wardrobe' = ANY(visible_sections));
