import { reactive, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { user } from './useAuth.js'
import { localDate } from '../utils/date.js'

export const ALL_SECTIONS = ['tasks', 'habits', 'calories', 'workout', 'notes', 'life', 'watchlist', 'finance', 'wardrobe', 'books']
export const MOBILE_NAV_MAX = 3
const DEFAULT_MOBILE_NAV = ['tasks', 'habits', 'calories']
const DEFAULT_DIET_TARGETS = { carb: 5, protein: 80, fried: 2, weight: null }

export const DB = reactive({
  tasks: [],
  habits: [],
  notes: [],
  meals: [],
  bodyLogs: [],
  partner: null,
  workouts: [],
  lifeCalendars: [],
  watchlist: [],
  finance: [],
  wardrobe: [],
  outfits: [],
  books: [],
  readingGoals: {},
  settings: { calorieGoal: 2000, dietTargets: { ...DEFAULT_DIET_TARGETS }, financeBudgets: {}, visibleSections: [...ALL_SECTIONS], mobileNavSections: [...DEFAULT_MOBILE_NAV] },
})

export const loading = ref(true)

function uid() { return user.value?.id }

// Supabase JS v2 query builders are lazy thenables — the HTTP request only fires
// when .then() is called. Without it, the query is never sent.
function dbRun(query) {
  query.then(({ error }) => { if (error) console.error('[Bloom] DB error:', error) })
}

// ── Load ───────────────────────────────────────────────────────
export async function load() {
  const userId = uid()
  if (!userId) return
  loading.value = true

  const [tasks, habits, notes, meals, bodyLogs, partnerRes, workouts, calendars, watchlist, finance, wardrobe, outfits, books, goals, settingsRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('notes').select('*').eq('user_id', userId).order('at', { ascending: false }),
    // meals and body_logs are not filtered by user: RLS returns my rows plus my partner's
    supabase.from('meals').select('*'),
    supabase.from('body_logs').select('*'),
    supabase.from('partners').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('workouts').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('life_calendars').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('watchlist').select('*').eq('user_id', userId).order('pri', { ascending: true }),
    supabase.from('finance_transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('wardrobe_items').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('wardrobe_outfits').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('books').select('*').eq('user_id', userId).order('at', { ascending: false }),
    supabase.from('reading_goals').select('*').eq('user_id', userId),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  DB.tasks = tasks.data || []
  DB.habits = habits.data || []
  DB.notes = notes.data || []

  DB.meals = meals.data || []
  DB.bodyLogs = bodyLogs.data || []

  DB.partner = null
  if (partnerRes.data) {
    const p = partnerRes.data
    const { data: ps } = await supabase.from('settings').select('calorie_goal, diet_targets').eq('user_id', p.partner_id).maybeSingle()
    DB.partner = {
      id: p.partner_id,
      name: p.partner_name || 'Pasangan',
      calorieGoal: ps?.calorie_goal || 2000,
      dietTargets: { ...DEFAULT_DIET_TARGETS, ...(ps?.diet_targets || {}) },
    }
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

  DB.watchlist = (watchlist.data || []).map(x => ({ ...x, priority: x.priority || 'want' }))

  DB.finance = finance.data || []

  DB.wardrobe = (wardrobe.data || []).map(x => ({ ...x, colors: x.colors || [], seasons: x.seasons || [], tags: x.tags || [] }))
  DB.outfits  = (outfits.data || []).map(o => ({ ...o, item_ids: o.item_ids || [], tags: o.tags || [] }))

  DB.books = (books.data || []).map(b => ({ ...b, genres: b.genres || [], quotes: b.quotes || [] }))
  DB.readingGoals = Object.fromEntries((goals.data || []).map(g => [g.year, g.target]))

  if (settingsRes.data) {
    DB.settings.calorieGoal      = settingsRes.data.calorie_goal
    DB.settings.dietTargets      = { ...DEFAULT_DIET_TARGETS, ...(settingsRes.data.diet_targets || {}) }
    DB.settings.financeBudgets   = settingsRes.data.finance_budgets || {}
    DB.settings.visibleSections  = settingsRes.data.visible_sections?.filter(s => s !== 'food') || [...ALL_SECTIONS]
    DB.settings.mobileNavSections = settingsRes.data.mobile_nav_sections || [...DEFAULT_MOBILE_NAV]
  } else {
    DB.settings.visibleSections = [...ALL_SECTIONS]
    DB.settings.mobileNavSections = [...DEFAULT_MOBILE_NAV]
    await supabase.from('settings').insert({ user_id: userId, calorie_goal: 2000, finance_budgets: {}, visible_sections: ALL_SECTIONS, mobile_nav_sections: DEFAULT_MOBILE_NAV })
  }

  loading.value = false
}

export function reset() {
  DB.tasks = []
  DB.habits = []
  DB.notes = []
  DB.meals = []
  DB.bodyLogs = []
  DB.partner = null
  DB.workouts = []
  DB.lifeCalendars = []
  DB.watchlist = []
  DB.finance = []
  DB.wardrobe = []
  DB.outfits = []
  DB.books = []
  DB.readingGoals = {}
  for (const k in imageUrls) delete imageUrls[k]
  DB.settings = { calorieGoal: 2000, dietTargets: { ...DEFAULT_DIET_TARGETS }, financeBudgets: {}, visibleSections: [...ALL_SECTIONS], mobileNavSections: [...DEFAULT_MOBILE_NAV] }
  loading.value = true
}

// ── Tasks ──────────────────────────────────────────────────────
export function addTask(task) {
  DB.tasks.unshift(task)
  dbRun(supabase.from('tasks').insert({ ...task, user_id: uid() }))
}

export function updateTask(id, updates) {
  const t = DB.tasks.find(x => x.id === id)
  if (t) Object.assign(t, updates)
  dbRun(supabase.from('tasks').update(updates).eq('id', id).eq('user_id', uid()))
}

export function deleteTask(id) {
  DB.tasks = DB.tasks.filter(x => x.id !== id)
  dbRun(supabase.from('tasks').delete().eq('id', id).eq('user_id', uid()))
}

// ── Habits ─────────────────────────────────────────────────────
export function addHabit(habit) {
  DB.habits.push(habit)
  dbRun(supabase.from('habits').insert({ ...habit, ins: habit.ins || [], user_id: uid() }))
}

export function updateHabitIns(id, ins) {
  const h = DB.habits.find(x => x.id === id)
  if (h) h.ins = ins
  dbRun(supabase.from('habits').update({ ins }).eq('id', id).eq('user_id', uid()))
}

export function deleteHabit(id) {
  DB.habits = DB.habits.filter(x => x.id !== id)
  dbRun(supabase.from('habits').delete().eq('id', id).eq('user_id', uid()))
}

// ── Notes ──────────────────────────────────────────────────────
export function upsertNote(note) {
  const idx = DB.notes.findIndex(x => x.id === note.id)
  if (idx >= 0) DB.notes[idx] = note
  else DB.notes.unshift(note)
  dbRun(supabase.from('notes').upsert({ ...note, user_id: uid() }))
}

export function deleteNote(id) {
  DB.notes = DB.notes.filter(x => x.id !== id)
  dbRun(supabase.from('notes').delete().eq('id', id).eq('user_id', uid()))
}

// ── Diet (meals + body logs) ───────────────────────────────────
// Rows carry their own user_id (mine or my partner's), so these do not filter
// by uid() — RLS decides what each of us may touch.
export function addMeal(meal) {
  DB.meals.push(meal)
  dbRun(supabase.from('meals').insert(meal))
}

export function updateMeal(id, updates) {
  const m = DB.meals.find(x => x.id === id)
  if (m) Object.assign(m, updates)
  dbRun(supabase.from('meals').update(updates).eq('id', id))
}

export function deleteMeal(id) {
  const m = DB.meals.find(x => x.id === id)
  if (m?.image_path) removeItemImage(m.image_path)
  DB.meals = DB.meals.filter(x => x.id !== id)
  dbRun(supabase.from('meals').delete().eq('id', id))
}

export async function uploadMealImage(ownerId, mealId, blob) {
  const path = `${ownerId}/meals/${mealId}-${Date.now()}.webp`
  const { error } = await supabase.storage.from(WARDROBE_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/webp' })
  if (error) throw error
  await ensureImageUrls([path])
  return path
}

export function saveBodyLog(log) {
  const idx = DB.bodyLogs.findIndex(x => x.id === log.id)
  if (idx >= 0) DB.bodyLogs[idx] = log
  else DB.bodyLogs.push(log)
  dbRun(supabase.from('body_logs').upsert(log))
}

export function deleteBodyLog(id) {
  DB.bodyLogs = DB.bodyLogs.filter(x => x.id !== id)
  dbRun(supabase.from('body_logs').delete().eq('id', id))
}

export async function saveSettings(settings) {
  Object.assign(DB.settings, settings)
  await supabase.from('settings').update({
    calorie_goal:        DB.settings.calorieGoal,
    diet_targets:        DB.settings.dietTargets,
    finance_budgets:     DB.settings.financeBudgets,
    visible_sections:    DB.settings.visibleSections,
    mobile_nav_sections: DB.settings.mobileNavSections,
  }).eq('user_id', uid()).select()
}

// ── Workouts ───────────────────────────────────────────────────
export function addWorkout(workout) {
  DB.workouts.unshift(workout)
  dbRun(supabase.from('workouts').insert({ ...workout, exercises: workout.exercises, user_id: uid() }))
}

export function deleteWorkout(id) {
  DB.workouts = DB.workouts.filter(x => x.id !== id)
  dbRun(supabase.from('workouts').delete().eq('id', id).eq('user_id', uid()))
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
  dbRun(supabase.from('life_calendars').upsert(calToRow(cal)))
}

export function deleteCalendar(id) {
  DB.lifeCalendars = DB.lifeCalendars.filter(c => c.id !== id)
  dbRun(supabase.from('life_calendars').delete().eq('id', id).eq('user_id', uid()))
}

export function saveCalendarEvents(calId, events) {
  const cal = DB.lifeCalendars.find(c => c.id === calId)
  if (cal) cal.events = events
  dbRun(supabase.from('life_calendars').update({ events }).eq('id', calId).eq('user_id', uid()))
}

// ── Watchlist ──────────────────────────────────────────────────
export function addWatchItem(item) {
  DB.watchlist.push(item)
  dbRun(supabase.from('watchlist').insert({ ...item, user_id: uid() }))
}

export function updateWatchItem(id, updates) {
  const item = DB.watchlist.find(x => x.id === id)
  if (item) Object.assign(item, updates)
  dbRun(supabase.from('watchlist').update(updates).eq('id', id).eq('user_id', uid()))
}

export function deleteWatchItem(id) {
  DB.watchlist = DB.watchlist.filter(x => x.id !== id)
  dbRun(supabase.from('watchlist').delete().eq('id', id).eq('user_id', uid()))
}

export function reorderWatchQueue(orderedIds) {
  orderedIds.forEach((id, idx) => {
    const item = DB.watchlist.find(x => x.id === id)
    if (item) item.pri = idx
    dbRun(supabase.from('watchlist').update({ pri: idx }).eq('id', id).eq('user_id', uid()))
  })
}

// ── Finance ────────────────────────────────────────────────────
export function addTransaction(tx) {
  DB.finance.unshift(tx)
  dbRun(supabase.from('finance_transactions').insert({ ...tx, user_id: uid() }))
}

export function updateTransaction(id, updates) {
  const t = DB.finance.find(x => x.id === id)
  if (t) Object.assign(t, updates)
  dbRun(supabase.from('finance_transactions').update(updates).eq('id', id).eq('user_id', uid()))
}

export function deleteTransaction(id) {
  DB.finance = DB.finance.filter(x => x.id !== id)
  dbRun(supabase.from('finance_transactions').delete().eq('id', id).eq('user_id', uid()))
}

// ── Wardrobe ───────────────────────────────────────────────────
const WARDROBE_BUCKET = 'wardrobe'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7   // seconds

// path -> { url, exp }. Signed URLs for the private bucket, refreshed before they expire.
export const imageUrls = reactive({})

export async function ensureImageUrls(paths) {
  const now = Date.now()
  const need = [...new Set(paths.filter(p => p && !(imageUrls[p]?.exp > now)))]
  if (!need.length) return
  const { data, error } = await supabase.storage.from(WARDROBE_BUCKET).createSignedUrls(need, SIGNED_URL_TTL)
  if (error) { console.error('[Bloom] Storage error:', error); return }
  const exp = now + (SIGNED_URL_TTL - 3600) * 1000
  for (const r of data || []) if (r.signedUrl) imageUrls[r.path] = { url: r.signedUrl, exp }
}

export async function uploadItemImage(itemId, blob) {
  const path = `${uid()}/${itemId}-${Date.now()}.webp`
  const { error } = await supabase.storage.from(WARDROBE_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/webp', upsert: true })
  if (error) throw error
  await ensureImageUrls([path])
  return path
}

export function removeItemImage(path) {
  if (!path) return
  delete imageUrls[path]
  dbRun(supabase.storage.from(WARDROBE_BUCKET).remove([path]))
}

export function addWardrobeItem(item) {
  DB.wardrobe.unshift(item)
  dbRun(supabase.from('wardrobe_items').insert({ ...item, user_id: uid() }))
}

export function updateWardrobeItem(id, updates) {
  const item = DB.wardrobe.find(x => x.id === id)
  if (item) Object.assign(item, updates)
  dbRun(supabase.from('wardrobe_items').update(updates).eq('id', id).eq('user_id', uid()))
}

export function archiveWardrobeItem(id, reason) {
  updateWardrobeItem(id, { status: 'archived', archive_reason: reason, archived_at: Date.now() })
}

export function restoreWardrobeItem(id) {
  updateWardrobeItem(id, { status: 'active', archive_reason: '', archived_at: null })
}

export function deleteWardrobeItem(id) {
  const item = DB.wardrobe.find(x => x.id === id)
  if (item?.image_path) removeItemImage(item.image_path)
  DB.wardrobe = DB.wardrobe.filter(x => x.id !== id)
  dbRun(supabase.from('wardrobe_items').delete().eq('id', id).eq('user_id', uid()))
  // Drop the item from any outfit that used it
  for (const o of DB.outfits) {
    if (o.item_ids.includes(id)) updateOutfit(o.id, { item_ids: o.item_ids.filter(x => x !== id) })
  }
}

export function addOutfit(outfit) {
  DB.outfits.unshift(outfit)
  dbRun(supabase.from('wardrobe_outfits').insert({ ...outfit, user_id: uid() }))
}

export function updateOutfit(id, updates) {
  const o = DB.outfits.find(x => x.id === id)
  if (o) Object.assign(o, updates)
  dbRun(supabase.from('wardrobe_outfits').update(updates).eq('id', id).eq('user_id', uid()))
}

export function deleteOutfit(id) {
  DB.outfits = DB.outfits.filter(x => x.id !== id)
  dbRun(supabase.from('wardrobe_outfits').delete().eq('id', id).eq('user_id', uid()))
}

// ── Books ──────────────────────────────────────────────────────
export function addBook(book) {
  DB.books.unshift(book)
  dbRun(supabase.from('books').insert({ ...book, user_id: uid() }))
}

export function updateBook(id, updates) {
  const b = DB.books.find(x => x.id === id)
  if (b) Object.assign(b, updates)
  dbRun(supabase.from('books').update(updates).eq('id', id).eq('user_id', uid()))
}

export function deleteBook(id) {
  DB.books = DB.books.filter(x => x.id !== id)
  dbRun(supabase.from('books').delete().eq('id', id).eq('user_id', uid()))
}

export function setReadingGoal(year, target) {
  DB.readingGoals[year] = target
  dbRun(supabase.from('reading_goals').upsert({ user_id: uid(), year, target }))
}

// ── Helpers ────────────────────────────────────────────────────
export function myId() { return uid() }

export function todayKcal() {
  const t = localDate()
  return DB.meals.filter(m => m.user_id === uid() && m.date === t).reduce((s, m) => s + (m.cal || 0), 0)
}
