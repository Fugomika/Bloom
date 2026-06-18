# Supabase Setup Guide

This is a beginner-friendly guide to spin up Supabase for Bloom.

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (it's free)
2. Click **New project**
3. Fill in:
   - **Name**: `bloom` (or anything you like)
   - **Database password**: pick a strong password and save it somewhere
   - **Region**: choose the one closest to you
4. Click **Create new project** and wait ~1 minute for it to provision

---

## Step 2 — Run the SQL Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the entire block below and click **Run**

```sql
-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pri TEXT DEFAULT 'medium',
  due TEXT DEFAULT '',
  done BOOLEAN DEFAULT false,
  at BIGINT NOT NULL
);

-- Habits
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT 'pink',
  ins TEXT[] DEFAULT '{}',
  at BIGINT NOT NULL
);

-- Notes
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  color TEXT DEFAULT '#FEF9C3',
  at BIGINT NOT NULL
);

-- Meals
CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  cal INTEGER DEFAULT 0,
  type TEXT DEFAULT 'snack',
  at BIGINT NOT NULL
);

-- Workouts
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  at BIGINT NOT NULL
);

-- Life Calendars
CREATE TABLE life_calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🌻',
  color TEXT DEFAULT '#34D399',
  start_date TEXT NOT NULL,
  total_years INTEGER DEFAULT 80,
  events JSONB DEFAULT '[]',
  created_at BIGINT NOT NULL
);

-- Settings (single row)
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  calorie_goal INTEGER DEFAULT 2000
);

INSERT INTO settings (id, calorie_goal) VALUES (1, 2000);
```

You should see "Success. No rows returned." — that means it worked.

---

## Step 3 — Disable Row Level Security (for single-user use)

Since Bloom is a personal app with no logins, the easiest approach is to open up the tables.

1. In the left sidebar, go to **Authentication → Policies**
2. For each table (`tasks`, `habits`, `notes`, `meals`, `workouts`, `life_calendars`, `settings`):
   - Click the table name
   - Toggle **Row Level Security** to **OFF**

> Alternatively, run this in the SQL Editor:
> ```sql
> ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
> ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
> ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
> ALTER TABLE meals DISABLE ROW LEVEL SECURITY;
> ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
> ALTER TABLE life_calendars DISABLE ROW LEVEL SECURITY;
> ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
> ```

---

## Step 4 — Get Your API Keys

1. In the left sidebar, click **Project Settings** (gear icon) → **API**
2. Copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long `eyJ...` string

---

## Step 5 — Add Keys to the App

1. In the `bloom-vue/` folder, create a file called `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-anon-key-here
```

Replace the values with what you copied in Step 4.

> `.env` is in `.gitignore` — it will never be committed to git.

---

## Step 6 — Run the App

```bash
cd bloom-vue
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

The app will show a **"Loading Bloom…"** screen briefly while it connects to Supabase, then load normally. All data you add is now stored in Supabase and synced across any device.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App shows loading forever | Check that `.env` has the correct URL and key, then restart `npm run dev` |
| "Failed to fetch" error in console | Make sure RLS is disabled (Step 3) |
| Data doesn't appear | Open Supabase → **Table Editor** to verify rows are being inserted |
| `relation "tasks" does not exist` | Re-run the SQL from Step 2 |
