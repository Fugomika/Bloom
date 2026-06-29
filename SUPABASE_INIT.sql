-- Bloom – full schema init (run after SUPABASE_CLEAR.sql)
-- Paste into Supabase SQL Editor → Run

-- ── Tables ────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id        TEXT PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  pri       TEXT DEFAULT 'medium',
  due       TEXT DEFAULT '',
  done      BOOLEAN DEFAULT false,
  at        BIGINT NOT NULL
);

CREATE TABLE habits (
  id      TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  emoji   TEXT DEFAULT '',
  color   TEXT DEFAULT 'pink',
  ins     TEXT[] DEFAULT '{}',
  at      BIGINT NOT NULL
);

CREATE TABLE notes (
  id      TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title   TEXT DEFAULT '',
  body    TEXT DEFAULT '',
  color   TEXT DEFAULT '#FEF9C3',
  at      BIGINT NOT NULL
);

CREATE TABLE meals (
  id      TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,
  name    TEXT NOT NULL,
  cal     INTEGER DEFAULT 0,
  type    TEXT DEFAULT 'snack',
  at      BIGINT NOT NULL
);

CREATE TABLE workouts (
  id        TEXT PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  name      TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  at        BIGINT NOT NULL
);

CREATE TABLE life_calendars (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '🌻',
  color       TEXT DEFAULT '#34D399',
  start_date  TEXT NOT NULL,
  total_years INTEGER DEFAULT 80,
  events      JSONB DEFAULT '[]',
  created_at  BIGINT NOT NULL
);

CREATE TABLE watchlist (
  id       TEXT PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  type     TEXT DEFAULT 'movie',
  status   TEXT DEFAULT 'queued',
  priority TEXT DEFAULT 'want',
  pri      INTEGER DEFAULT 0,
  at       BIGINT NOT NULL
);

-- One row per user — stores calorie goal and which sections are visible
CREATE TABLE settings (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_goal     INTEGER DEFAULT 2000,
  visible_sections TEXT[]  DEFAULT ARRAY['tasks','habits','calories','workout','notes','life','watchlist']
);

-- ── Row Level Security ────────────────────────────────────────────

ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tasks"       ON tasks          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own habits"      ON habits         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notes"       ON notes          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own meals"       ON meals          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own workouts"    ON workouts       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own calendars"   ON life_calendars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own watchlist"   ON watchlist      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own settings"    ON settings       FOR ALL USING (auth.uid() = user_id);
