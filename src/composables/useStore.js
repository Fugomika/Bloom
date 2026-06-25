import { reactive, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { user } from './useAuth.js'
import { today } from '../utils/date.js'

export const ALL_SECTIONS = ['tasks', 'habits', 'calories', 'workout', 'notes', 'life', 'watchlist', 'food']

export const DB = reactive({
  tasks: [],
  habits: [],
  notes: [],
  meals: {},
  workouts: [],
  lifeCalendars: [],
  watchlist: [],
  foodSpots: [],
  settings: { calorieGoal: 2000, visibleSections: [...ALL_SECTIONS], foodTree: null },
})

export const loading = ref(true)

function uid() { return user.value?.id }

// ── Load ───────────────────────────────────────────────────────
export async function load() {
  const userId = uid()
  if (!userId) return
  loading.value = true

  const [tasks, habits, notes, meals, workouts, calendars, watchlist, foodSpots, settingsRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('notes').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('meals').select('*').eq('user_id', userId),
    supabase.from('workouts').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('life_calendars').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('watchlist').select('*').eq('user_id', userId).order('pri', { ascending: true }),
    supabase.from('food_spots').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  DB.tasks = tasks.data || []
  DB.habits = habits.data || []
  DB.notes = notes.data || []

  DB.meals = {}
  for (const m of (meals.data || [])) {
    if (!DB.meals[m.date]) DB.meals[m.date] = []
    DB.meals[m.date].push(m)
  }

  DB.workouts = (workouts.data || []).map(w => ({ ...w, exercises: w.exercises || [] }))

  DB.lifeCalendars = (calendars.data || []).map(c => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    color: c.color,
    startDate: c.start_date,
    totalYears: c.total_years,
    events: c.events || [],
    createdAt: c.created_at,
  }))

  DB.watchlist = watchlist.data || []
  DB.foodSpots = (foodSpots.data || []).map(f => ({
    id: f.id,
    name: f.name,
    notes: f.notes || '',
    // backward compat: if tags column empty, derive from old carb_type + texture
    tags: (f.tags && f.tags.length) ? f.tags : [f.carb_type, f.texture].filter(Boolean),
    at: f.at,
  }))

  if (settingsRes.data) {
    DB.settings.calorieGoal    = settingsRes.data.calorie_goal
    DB.settings.visibleSections = settingsRes.data.visible_sections || [...ALL_SECTIONS]
    DB.settings.foodTree        = settingsRes.data.food_tree || null
  } else {
    DB.settings.visibleSections = [...ALL_SECTIONS]
    DB.settings.foodTree        = null
    await supabase.from('settings').insert({ user_id: userId, calorie_goal: 2000, visible_sections: ALL_SECTIONS, food_tree: null })
  }

  loading.value = false
}

export function reset() {
  DB.tasks = []
  DB.habits = []
  DB.notes = []
  DB.meals = {}
  DB.workouts = []
  DB.lifeCalendars = []
  DB.watchlist = []
  DB.foodSpots = []
  DB.settings = { calorieGoal: 2000, visibleSections: [...ALL_SECTIONS], foodTree: null }
  loading.value = true
}

// ── Tasks ──────────────────────────────────────────────────────
export function addTask(task) {
  DB.tasks.unshift(task)
  supabase.from('tasks').insert({ ...task, user_id: uid() })
}

export function updateTask(id, updates) {
  const t = DB.tasks.find(x => x.id === id)
  if (t) Object.assign(t, updates)
  supabase.from('tasks').update(updates).eq('id', id).eq('user_id', uid())
}

export function deleteTask(id) {
  DB.tasks = DB.tasks.filter(x => x.id !== id)
  supabase.from('tasks').delete().eq('id', id).eq('user_id', uid())
}

// ── Habits ─────────────────────────────────────────────────────
export function addHabit(habit) {
  DB.habits.push(habit)
  supabase.from('habits').insert({ ...habit, ins: habit.ins || [], user_id: uid() })
}

export function updateHabitIns(id, ins) {
  const h = DB.habits.find(x => x.id === id)
  if (h) h.ins = ins
  supabase.from('habits').update({ ins }).eq('id', id).eq('user_id', uid())
}

export function deleteHabit(id) {
  DB.habits = DB.habits.filter(x => x.id !== id)
  supabase.from('habits').delete().eq('id', id).eq('user_id', uid())
}

// ── Notes ──────────────────────────────────────────────────────
export function upsertNote(note) {
  const idx = DB.notes.findIndex(x => x.id === note.id)
  if (idx >= 0) DB.notes[idx] = note
  else DB.notes.unshift(note)
  supabase.from('notes').upsert({ ...note, user_id: uid() })
}

export function deleteNote(id) {
  DB.notes = DB.notes.filter(x => x.id !== id)
  supabase.from('notes').delete().eq('id', id).eq('user_id', uid())
}

// ── Meals ──────────────────────────────────────────────────────
export function addMeal(meal) {
  const t = today()
  if (!DB.meals[t]) DB.meals[t] = []
  DB.meals[t].push(meal)
  supabase.from('meals').insert({ ...meal, date: t, user_id: uid() })
}

export function deleteMeal(id) {
  const t = today()
  if (DB.meals[t]) DB.meals[t] = DB.meals[t].filter(m => m.id !== id)
  supabase.from('meals').delete().eq('id', id).eq('user_id', uid())
}

export async function saveSettings(settings) {
  Object.assign(DB.settings, settings)
  await supabase.from('settings').update({
    calorie_goal:     DB.settings.calorieGoal,
    visible_sections: DB.settings.visibleSections,
    food_tree:        DB.settings.foodTree,
  }).eq('user_id', uid()).select()
}

// ── Workouts ───────────────────────────────────────────────────
export function addWorkout(workout) {
  DB.workouts.unshift(workout)
  supabase.from('workouts').insert({ ...workout, exercises: workout.exercises, user_id: uid() })
}

export function deleteWorkout(id) {
  DB.workouts = DB.workouts.filter(x => x.id !== id)
  supabase.from('workouts').delete().eq('id', id).eq('user_id', uid())
}

// ── Life Calendars ─────────────────────────────────────────────
function calToRow(cal) {
  return {
    id: cal.id,
    name: cal.name,
    emoji: cal.emoji,
    color: cal.color,
    start_date: cal.startDate,
    total_years: cal.totalYears,
    events: cal.events || [],
    created_at: cal.createdAt,
    user_id: uid(),
  }
}

export function upsertCalendar(cal) {
  const idx = DB.lifeCalendars.findIndex(c => c.id === cal.id)
  if (idx >= 0) DB.lifeCalendars[idx] = cal
  else DB.lifeCalendars.push(cal)
  supabase.from('life_calendars').upsert(calToRow(cal))
}

export function deleteCalendar(id) {
  DB.lifeCalendars = DB.lifeCalendars.filter(c => c.id !== id)
  supabase.from('life_calendars').delete().eq('id', id).eq('user_id', uid())
}

export function saveCalendarEvents(calId, events) {
  const cal = DB.lifeCalendars.find(c => c.id === calId)
  if (cal) cal.events = events
  supabase.from('life_calendars').update({ events }).eq('id', calId).eq('user_id', uid())
}

// ── Watchlist ──────────────────────────────────────────────────
export function addWatchItem(item) {
  DB.watchlist.push(item)
  supabase.from('watchlist').insert({ ...item, user_id: uid() })
}

export function updateWatchItem(id, updates) {
  const item = DB.watchlist.find(x => x.id === id)
  if (item) Object.assign(item, updates)
  supabase.from('watchlist').update(updates).eq('id', id).eq('user_id', uid())
}

export function deleteWatchItem(id) {
  DB.watchlist = DB.watchlist.filter(x => x.id !== id)
  supabase.from('watchlist').delete().eq('id', id).eq('user_id', uid())
}

export function reorderWatchQueue(orderedIds) {
  orderedIds.forEach((id, idx) => {
    const item = DB.watchlist.find(x => x.id === id)
    if (item) item.pri = idx
    supabase.from('watchlist').update({ pri: idx }).eq('id', id).eq('user_id', uid())
  })
}

// ── Food Spots ─────────────────────────────────────────────────
export function addFoodSpot(spot) {
  DB.foodSpots.unshift(spot)
  supabase.from('food_spots').insert({ id: spot.id, name: spot.name, notes: spot.notes, tags: spot.tags || [], at: spot.at, user_id: uid() })
}

export function updateFoodSpot(id, updates) {
  const spot = DB.foodSpots.find(x => x.id === id)
  if (spot) Object.assign(spot, updates)
  const row = {}
  if (updates.name  !== undefined) row.name  = updates.name
  if (updates.notes !== undefined) row.notes = updates.notes
  if (updates.tags  !== undefined) row.tags  = updates.tags
  supabase.from('food_spots').update(row).eq('id', id).eq('user_id', uid())
}

export function deleteFoodSpot(id) {
  DB.foodSpots = DB.foodSpots.filter(x => x.id !== id)
  supabase.from('food_spots').delete().eq('id', id).eq('user_id', uid())
}

// ── Helpers ────────────────────────────────────────────────────
export function todayMeals() {
  return DB.meals[today()] || []
}

export function todayKcal() {
  return todayMeals().reduce((s, m) => s + m.cal, 0)
}
