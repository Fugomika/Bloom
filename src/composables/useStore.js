import { reactive, ref } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { today } from '../utils/date.js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const DB = reactive({
  tasks: [],
  habits: [],
  notes: [],
  meals: {},
  workouts: [],
  lifeCalendars: [],
  settings: { calorieGoal: 2000 },
})

export const loading = ref(true)

// ── Load ───────────────────────────────────────────────────────
export async function load() {
  loading.value = true
  const [tasks, habits, notes, meals, workouts, calendars, settingsRes] = await Promise.all([
    supabase.from('tasks').select('*').order('at', { ascending: false }),
    supabase.from('habits').select('*').order('at', { ascending: false }),
    supabase.from('notes').select('*').order('at', { ascending: false }),
    supabase.from('meals').select('*'),
    supabase.from('workouts').select('*').order('at', { ascending: false }),
    supabase.from('life_calendars').select('*').order('created_at', { ascending: true }),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
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

  if (settingsRes.data) {
    DB.settings.calorieGoal = settingsRes.data.calorie_goal
  } else {
    await supabase.from('settings').insert({ id: 1, calorie_goal: 2000 })
  }

  loading.value = false
}

// ── Tasks ──────────────────────────────────────────────────────
export function addTask(task) {
  DB.tasks.unshift(task)
  supabase.from('tasks').insert(task)
}

export function updateTask(id, updates) {
  const t = DB.tasks.find(x => x.id === id)
  if (t) Object.assign(t, updates)
  supabase.from('tasks').update(updates).eq('id', id)
}

export function deleteTask(id) {
  DB.tasks = DB.tasks.filter(x => x.id !== id)
  supabase.from('tasks').delete().eq('id', id)
}

// ── Habits ─────────────────────────────────────────────────────
export function addHabit(habit) {
  DB.habits.push(habit)
  supabase.from('habits').insert({ ...habit, ins: habit.ins || [] })
}

export function updateHabitIns(id, ins) {
  const h = DB.habits.find(x => x.id === id)
  if (h) h.ins = ins
  supabase.from('habits').update({ ins }).eq('id', id)
}

export function deleteHabit(id) {
  DB.habits = DB.habits.filter(x => x.id !== id)
  supabase.from('habits').delete().eq('id', id)
}

// ── Notes ──────────────────────────────────────────────────────
export function upsertNote(note) {
  const idx = DB.notes.findIndex(x => x.id === note.id)
  if (idx >= 0) DB.notes[idx] = note
  else DB.notes.unshift(note)
  supabase.from('notes').upsert(note)
}

export function deleteNote(id) {
  DB.notes = DB.notes.filter(x => x.id !== id)
  supabase.from('notes').delete().eq('id', id)
}

// ── Meals ──────────────────────────────────────────────────────
export function addMeal(meal) {
  const t = today()
  if (!DB.meals[t]) DB.meals[t] = []
  DB.meals[t].push(meal)
  supabase.from('meals').insert({ ...meal, date: t })
}

export function deleteMeal(id) {
  const t = today()
  if (DB.meals[t]) DB.meals[t] = DB.meals[t].filter(m => m.id !== id)
  supabase.from('meals').delete().eq('id', id)
}

export function saveSettings(settings) {
  Object.assign(DB.settings, settings)
  supabase.from('settings').update({ calorie_goal: settings.calorieGoal }).eq('id', 1)
}

// ── Workouts ───────────────────────────────────────────────────
export function addWorkout(workout) {
  DB.workouts.unshift(workout)
  supabase.from('workouts').insert({ ...workout, exercises: workout.exercises })
}

export function deleteWorkout(id) {
  DB.workouts = DB.workouts.filter(x => x.id !== id)
  supabase.from('workouts').delete().eq('id', id)
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
  supabase.from('life_calendars').delete().eq('id', id)
}

export function saveCalendarEvents(calId, events) {
  const cal = DB.lifeCalendars.find(c => c.id === calId)
  if (cal) cal.events = events
  supabase.from('life_calendars').update({ events }).eq('id', calId)
}

// ── Helpers ────────────────────────────────────────────────────
export function todayMeals() {
  return DB.meals[today()] || []
}

export function todayKcal() {
  return todayMeals().reduce((s, m) => s + m.cal, 0)
}
