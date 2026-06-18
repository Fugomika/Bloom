# Supabase Setup Guide

Beginner-friendly guide to spin up Supabase for Bloom with full auth and per-user data.

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New project**
3. Fill in:
   - **Name**: `bloom`
   - **Database password**: pick something strong, save it
   - **Region**: closest to you
4. Click **Create new project** — wait ~1 minute

---

## Step 2 — Enable Email Auth

1. In the left sidebar go to **Authentication → Providers**
2. Find **Email** — it should already be enabled by default
3. Leave the settings as-is (magic links off, email confirmations on is fine)

---

## Step 3 — Run the SQL Schema

1. Click **SQL Editor** in the left sidebar → **New query**
2. Paste the entire block below and click **Run**

```sql
-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pri TEXT DEFAULT 'medium',
  due TEXT DEFAULT '',
  done BOOLEAN DEFAULT false,
  at BIGINT NOT NULL
);

-- Habits
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  color TEXT DEFAULT 'pink',
  ins TEXT[] DEFAULT '{}',
  at BIGINT NOT NULL
);

-- Notes
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  color TEXT DEFAULT '#FEF9C3',
  at BIGINT NOT NULL
);

-- Meals
CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  cal INTEGER DEFAULT 0,
  type TEXT DEFAULT 'snack',
  at BIGINT NOT NULL
);

-- Workouts
CREATE TABLE workouts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  at BIGINT NOT NULL
);

-- Life Calendars
CREATE TABLE life_calendars (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🌻',
  color TEXT DEFAULT '#34D399',
  start_date TEXT NOT NULL,
  total_years INTEGER DEFAULT 80,
  events JSONB DEFAULT '[]',
  created_at BIGINT NOT NULL
);

-- Settings (one row per user)
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_goal INTEGER DEFAULT 2000
);
```

You should see "Success. No rows returned."

---

## Step 4 — Enable Row Level Security

Run this in a second SQL query to lock each table down to its owner:

```sql
-- Enable RLS on all tables
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;

-- Each user can only see and modify their own rows
CREATE POLICY "own tasks"     ON tasks          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own habits"    ON habits         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notes"     ON notes          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own meals"     ON meals          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own workouts"  ON workouts       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own calendars" ON life_calendars FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own settings"  ON settings       FOR ALL USING (auth.uid() = user_id);
```

This is what makes the app secure — the anon key can only reach rows that belong to the signed-in user.

---

## Step 5 — Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** — `https://abcdefgh.supabase.co`
   - **anon / public key** — the long `eyJ...` string

---

## Step 6 — Add Keys to the App

Create a `.env` file inside `bloom-vue/`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyour-anon-key-here
```

> `.env` is gitignored — it will never be committed.

---

## Step 7 — Run the App

```bash
cd bloom-vue
npm run dev
```

Open `http://localhost:5173`. The login screen will appear.

**First time:** click "Create one →", sign up with your email, confirm the email Supabase sends you, then sign in.

After that, every sign-in loads your personal data. Data is private to your account.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Login screen shows but sign-in fails | Double-check your `.env` URL and key match Supabase exactly |
| "new row violates row-level security" | Make sure you ran Step 4 (RLS policies) |
| App shows loading forever after sign-in | Open browser DevTools → Console for the specific error |
| Email confirmation not arriving | Check spam; or in Supabase go to Auth → Users and manually confirm |
| `relation "tasks" does not exist` | Re-run the SQL from Step 3 |
