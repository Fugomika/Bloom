-- Turns the Calories section into the Diet module (free-text meal log, portions,
-- photos, body log) and lets two paired accounts read and write each other's diet data.
-- Run once in Supabase SQL Editor. Safe to run even if already applied.

-- ── Meals: text-first entries, numbers optional ───────────────────
ALTER TABLE meals ADD COLUMN IF NOT EXISTS time       TEXT;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS carb       NUMERIC;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS protein    NUMERIC;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fried      INTEGER DEFAULT 0;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS image_path TEXT DEFAULT '';
-- cal = NULL now means "not counted yet"
ALTER TABLE meals ALTER COLUMN cal  DROP DEFAULT;
ALTER TABLE meals ALTER COLUMN name SET DEFAULT '';

CREATE TABLE IF NOT EXISTS body_logs (
  id       TEXT PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  weight   NUMERIC NOT NULL,
  fat      NUMERIC,
  muscle   NUMERIC,
  visceral NUMERIC,
  at       BIGINT NOT NULL
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS diet_targets JSONB DEFAULT '{"carb":5,"protein":80,"fried":2,"weight":null}';

-- ── Partner pairing ───────────────────────────────────────────────
-- A row (user_id, partner_id) lets user_id read and write partner_id's diet data.
-- Rows are only ever created here in the SQL Editor: there is no INSERT policy,
-- so nobody can pair themselves with an account from the app.
CREATE TABLE IF NOT EXISTS partners (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_name TEXT DEFAULT 'Pasangan'
);

ALTER TABLE body_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own partner row" ON partners;
CREATE POLICY "own partner row" ON partners FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION is_partner(owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.partners WHERE user_id = auth.uid() AND partner_id = owner)
$$;

DROP POLICY IF EXISTS "own meals" ON meals;
DROP POLICY IF EXISTS "own or partner meals" ON meals;
CREATE POLICY "own or partner meals" ON meals FOR ALL
  USING (auth.uid() = user_id OR is_partner(user_id));

DROP POLICY IF EXISTS "own or partner body_logs" ON body_logs;
CREATE POLICY "own or partner body_logs" ON body_logs FOR ALL
  USING (auth.uid() = user_id OR is_partner(user_id));

-- A partner may read (not change) the other's targets
DROP POLICY IF EXISTS "partner settings read" ON settings;
CREATE POLICY "partner settings read" ON settings FOR SELECT USING (is_partner(user_id));

-- ── Meal photos ───────────────────────────────────────────────────
-- Stored in the existing private 'wardrobe' bucket under {uid}/meals/..., so the
-- owner is already covered by the "wardrobe own *" policies. These add the partner,
-- limited to the meals/ subfolder (wardrobe photos stay private).
DROP POLICY IF EXISTS "meal photos partner select" ON storage.objects;
DROP POLICY IF EXISTS "meal photos partner insert" ON storage.objects;
DROP POLICY IF EXISTS "meal photos partner delete" ON storage.objects;

CREATE POLICY "meal photos partner select" ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe' AND (storage.foldername(objects.name))[2] = 'meals'
    AND EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.partner_id::text = (storage.foldername(objects.name))[1]));
CREATE POLICY "meal photos partner insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wardrobe' AND (storage.foldername(objects.name))[2] = 'meals'
    AND EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.partner_id::text = (storage.foldername(objects.name))[1]));
CREATE POLICY "meal photos partner delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'wardrobe' AND (storage.foldername(objects.name))[2] = 'meals'
    AND EXISTS (SELECT 1 FROM public.partners p WHERE p.user_id = auth.uid() AND p.partner_id::text = (storage.foldername(objects.name))[1]));

-- ── Pair the two accounts (edit the emails and names, then run) ───
-- Both people must have signed in to Bloom at least once first.
--
-- INSERT INTO partners (user_id, partner_id, partner_name)
-- SELECT a.id, b.id, 'NAMA_DIA' FROM auth.users a, auth.users b
-- WHERE a.email = 'EMAIL_KAMU' AND b.email = 'EMAIL_DIA'
-- ON CONFLICT (user_id) DO UPDATE SET partner_id = EXCLUDED.partner_id, partner_name = EXCLUDED.partner_name;
--
-- INSERT INTO partners (user_id, partner_id, partner_name)
-- SELECT a.id, b.id, 'NAMA_KAMU' FROM auth.users a, auth.users b
-- WHERE a.email = 'EMAIL_DIA' AND b.email = 'EMAIL_KAMU'
-- ON CONFLICT (user_id) DO UPDATE SET partner_id = EXCLUDED.partner_id, partner_name = EXCLUDED.partner_name;
