import { reactive } from 'vue'
import { uid, today } from '../utils/date.js'

export const DB = reactive({
  tasks: [],
  habits: [],
  notes: [],
  meals: {},
  workouts: [],
  lifeCalendars: [],
  settings: { calorieGoal: 2000 },
})

export function save() {
  localStorage.setItem('bloom_v3', JSON.stringify(DB))
}

export function load() {
  let r = localStorage.getItem('bloom_v3')
  if (r) {
    const parsed = JSON.parse(r)
    // migrate single-calendar format to multi-calendar
    if (!parsed.lifeCalendars) {
      parsed.lifeCalendars = []
      if (parsed.settings?.birthDate) {
        parsed.lifeCalendars.push({
          id: uid(), name: 'My Life in Months', emoji: '🌻', color: '#FBBF24',
          startDate: parsed.settings.birthDate,
          totalYears: parsed.settings.lifeExpectancy || 80,
          events: parsed.lifeEvents || [],
          createdAt: Date.now(),
        })
        delete parsed.settings.birthDate
        delete parsed.settings.lifeExpectancy
      }
      delete parsed.lifeEvents
    }
    Object.assign(DB, parsed)
    return
  }
  // migrate from v2
  r = localStorage.getItem('bloom_v2')
  if (r) {
    const v2 = JSON.parse(r)
    DB.tasks = v2.tasks || []
    DB.habits = v2.habits || []
    DB.notes = v2.notes || []
    DB.meals = {}; DB.workouts = []; DB.lifeCalendars = []
    DB.settings = { calorieGoal: 2000 }
    save()
    return
  }
  seed()
}

export function seed() {
  const t = today()
  DB.tasks = [
    { id: uid(), title: 'Review project proposal 📄', pri: 'high', due: t, done: false, at: Date.now() },
    { id: uid(), title: 'Reply to emails', pri: 'medium', due: '', done: false, at: Date.now() - 1 },
    { id: uid(), title: 'Go for a walk 🌻', pri: 'low', due: t, done: true, at: Date.now() - 2 },
  ]
  DB.habits = [
    { id: uid(), name: 'Morning Run', emoji: '🏃', color: 'orange', ins: [t], at: Date.now() },
    { id: uid(), name: 'Read 30 min', emoji: '📚', color: 'purple', ins: [], at: Date.now() - 1 },
    { id: uid(), name: 'Drink 8 Glasses', emoji: '💧', color: 'teal', ins: [t], at: Date.now() - 2 },
  ]
  DB.notes = [
    { id: uid(), title: 'Weekend Plans 🌻', body: 'Visit the farmers market\nTry that new café\nCall mom', color: '#FEF9C3', at: Date.now() },
    { id: uid(), title: 'Books to Read 📚', body: 'Atomic Habits – James Clear\nDeep Work – Cal Newport', color: '#DBEAFE', at: Date.now() - 1 },
  ]
  DB.meals = {
    [t]: [
      { id: uid(), name: 'Oatmeal + Banana', cal: 320, type: 'breakfast', at: Date.now() - 5 },
      { id: uid(), name: 'Grilled Chicken Rice', cal: 480, type: 'lunch', at: Date.now() - 3 },
      { id: uid(), name: 'Apple', cal: 80, type: 'snack', at: Date.now() - 2 },
    ]
  }
  DB.workouts = [{
    id: uid(), date: t, name: 'Morning Strength',
    exercises: [
      { id: uid(), name: 'Bench Press', sets: 3, reps: 10, weight: 60 },
      { id: uid(), name: 'Squats', sets: 4, reps: 8, weight: 80 },
      { id: uid(), name: 'Pull-ups', sets: 3, reps: 12, weight: 0 },
    ], at: Date.now()
  }]
  DB.settings = { calorieGoal: 2000 }
  DB.lifeCalendars = []
  save()
}

export function todayMeals() {
  return DB.meals[today()] || []
}

export function todayKcal() {
  return todayMeals().reduce((s, m) => s + m.cal, 0)
}
