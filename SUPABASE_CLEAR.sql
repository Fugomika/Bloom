-- Run this in Supabase SQL Editor to wipe all Bloom tables.
-- After running this, run SUPABASE_INIT.sql to recreate from scratch.

DROP TABLE IF EXISTS food_spots;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS life_calendars;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS meals;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS settings;
