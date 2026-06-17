<script setup>
import { computed } from 'vue'
import { DB, todayKcal, save } from '../../composables/useStore.js'
import { streak, today } from '../../utils/date.js'
import { MONTHS, DAYS } from '../../utils/constants.js'
import { confetti } from '../../composables/useConfetti.js'

const now = new Date()
const h = now.getHours()
const greeting = h < 12 ? '☀️ Good Morning!' : h < 17 ? '🌤️ Good Afternoon!' : '🌙 Good Evening!'
const greetSub = computed(() => {
  const n = new Date()
  return `${DAYS[n.getDay()]}, ${MONTHS[n.getMonth()]} ${n.getDate()} — Let's make it count! 🌻`
})

const t = today()
const stCal    = computed(() => todayKcal().toLocaleString())
const stWkt    = computed(() => DB.workouts.filter(w => w.date === t).length)
const stPend   = computed(() => DB.tasks.filter(x => !x.done).length)
const stStreak = computed(() => DB.habits.reduce((m, h) => Math.max(m, streak(h.ins)), 0))

const activeTasks = computed(() => DB.tasks.filter(x => !x.done).slice(0, 5))
const recentNotes = computed(() => [...DB.notes].sort((a, b) => b.at - a.at).slice(0, 3))
const todayWkt    = computed(() => DB.workouts.filter(w => w.date === t))

const kcal = computed(() => todayKcal())
const goal = computed(() => DB.settings.calorieGoal)
const calPct = computed(() => Math.min(kcal.value / goal.value, 1))

function qToggle(id) {
  const task = DB.tasks.find(x => x.id === id)
  if (task) { task.done = !task.done; if (task.done) confetti(); save() }
}
function qHabit(id) {
  const hb = DB.habits.find(x => x.id === id)
  if (!hb) return
  if (hb.ins.includes(t)) hb.ins = hb.ins.filter(d => d !== t)
  else { hb.ins.push(t); confetti() }
  save()
}
</script>

<template>
  <div>
    <div class="sec-head">
      <div class="greeting">{{ greeting }}</div>
      <div class="greeting-sub">{{ greetSub }}</div>
    </div>

    <div class="stats-row">
      <div class="stat c-sun" ><span class="se">🥗</span><span class="sn">{{ stCal }}</span><div class="sl">kcal today</div><span class="sb">🥗</span></div>
      <div class="stat c-leaf"><span class="se">💪</span><span class="sn">{{ stWkt }}</span><div class="sl">workouts</div><span class="sb">💪</span></div>
      <div class="stat c-coral"><span class="se">📋</span><span class="sn">{{ stPend }}</span><div class="sl">tasks left</div><span class="sb">📋</span></div>
      <div class="stat c-red"><span class="se">🔥</span><span class="sn">{{ stStreak }}</span><div class="sl">best streak</div><span class="sb">🔥</span></div>
    </div>

    <div class="dash-grid">
      <!-- Active Tasks -->
      <div class="card">
        <div class="widget-title">✅ Active Tasks</div>
        <div v-if="activeTasks.length">
          <div v-for="x in activeTasks" :key="x.id" class="qitem">
            <div class="chk" :class="{ on: x.done }" @click="qToggle(x.id)">{{ x.done ? '✓' : '' }}</div>
            <span style="flex:1;font-weight:700;font-size:13px">{{ x.title }}</span>
            <span class="badge" :class="`b-${x.pri}`">{{ x.pri }}</span>
          </div>
        </div>
        <div v-else class="empty" style="padding:18px"><span class="ee" style="font-size:34px">🎉</span><p>All caught up!</p></div>
      </div>

      <!-- Today's Habits -->
      <div class="card">
        <div class="widget-title">🔥 Today's Habits</div>
        <div v-if="DB.habits.length">
          <div v-for="hb in DB.habits" :key="hb.id" class="qitem">
            <span style="font-size:19px">{{ hb.emoji }}</span>
            <span style="flex:1;font-weight:700;font-size:13px">{{ hb.name }}</span>
            <span style="font-size:11px;font-weight:800;color:#F97316">🔥{{ streak(hb.ins) }}</span>
            <div class="chk" :class="{ on: hb.ins.includes(t) }" style="margin-left:8px" @click="qHabit(hb.id)">{{ hb.ins.includes(t) ? '✓' : '' }}</div>
          </div>
        </div>
        <div v-else style="color:var(--muted);font-weight:700;font-size:13px;padding:10px 0">No habits yet 🌱</div>
      </div>

      <!-- Today's Calories -->
      <div class="card">
        <div class="widget-title">🥗 Today's Calories</div>
        <div style="display:flex;align-items:center;gap:14px">
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle cx="35" cy="35" r="28" fill="none" stroke="#FEF3C7" stroke-width="8"/>
            <circle cx="35" cy="35" r="28" fill="none" :stroke="kcal > goal ? '#EF4444' : '#22C55E'" stroke-width="8"
              :stroke-dasharray="175.93" :stroke-dashoffset="175.93 * (1 - calPct)"
              stroke-linecap="round" transform="rotate(-90 35 35)"/>
          </svg>
          <div>
            <div style="font-family:'Fredoka One',cursive;font-size:20px;color:var(--sun-dk)">{{ kcal.toLocaleString() }}</div>
            <div style="font-size:11px;font-weight:800;color:var(--muted)">of {{ goal.toLocaleString() }} kcal</div>
            <div :style="`font-size:11px;font-weight:800;color:${kcal > goal ? '#DC2626' : 'var(--leaf-dk)'}`">
              {{ kcal > goal ? `${(kcal - goal).toLocaleString()} over` : `${(goal - kcal).toLocaleString()} left` }}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Workout -->
      <div class="card">
        <div class="widget-title">💪 Recent Workout</div>
        <div v-if="todayWkt.length">
          <div v-for="w in todayWkt" :key="w.id" style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:18px">💪</span>
            <div>
              <div style="font-weight:800;font-size:13px">{{ w.name }}</div>
              <div style="font-size:11px;color:var(--muted);font-weight:700">{{ w.exercises.length }} exercise{{ w.exercises.length !== 1 ? 's' : '' }}</div>
            </div>
          </div>
        </div>
        <div v-else style="color:var(--muted);font-weight:700;font-size:13px;padding:10px 0">No workouts today 🏋️</div>
      </div>

      <!-- Recent Notes -->
      <div class="card dash-full">
        <div class="widget-title">📝 Recent Notes</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
          <div v-if="recentNotes.length" v-for="n in recentNotes" :key="n.id"
            :style="`background:${n.color};border-radius:12px;padding:12px;cursor:pointer;transition:transform .18s`"
            @mouseover="$event.target.closest('div').style.transform='translateY(-3px)'"
            @mouseout="$event.target.closest('div').style.transform=''"
          >
            <div style="font-family:'Fredoka One',cursive;font-size:13px;margin-bottom:4px">{{ n.title }}</div>
            <div style="font-size:11px;font-weight:600;opacity:.7;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:pre-line">{{ n.body }}</div>
          </div>
          <div v-else style="color:var(--muted);font-weight:700;font-size:13px;padding:10px 0">No notes yet ✍️</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.greeting { font-family:'Fredoka One',cursive; font-size:32px }
.greeting-sub { font-size:14px; font-weight:700; color:var(--muted); margin:3px 0 24px }
.stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px }
.stat { border-radius:var(--r); padding:20px 18px; color:#fff; position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; cursor:default }
.stat:hover { transform:translateY(-4px); box-shadow:var(--sh-md) }
.stat.c-sun   { background:linear-gradient(135deg,#FBBF24,#D97706) }
.stat.c-leaf  { background:linear-gradient(135deg,#22C55E,#15803D) }
.stat.c-coral { background:linear-gradient(135deg,#F97316,#EA580C) }
.stat.c-red   { background:linear-gradient(135deg,#EF4444,#DC2626) }
.stat .se { font-size:26px; display:block; margin-bottom:4px }
.stat .sn { font-family:'Fredoka One',cursive; font-size:36px; line-height:1; display:block }
.stat .sl { font-size:10px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; opacity:.85; margin-top:2px }
.stat .sb { position:absolute; right:-6px; bottom:-8px; font-size:60px; opacity:.12; line-height:1; pointer-events:none }
.dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px }
.dash-full { grid-column:1/-1 }
.qitem { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border) }
.qitem:last-child { border-bottom:none }
.chk { width:22px; height:22px; border-radius:7px; border:2.5px solid #D1D5DB; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; transition:all .18s; user-select:none }
.chk:hover:not(.on) { border-color:var(--sun); background:var(--sun-lt) }
.chk.on { background:var(--sun); border-color:var(--sun); color:#1A0E00; font-weight:900 }
@media(max-width:960px) {
  .stats-row { grid-template-columns:1fr 1fr }
  .dash-grid  { grid-template-columns:1fr }
}
@media(max-width:600px) {
  .stats-row { grid-template-columns:1fr 1fr; gap:9px }
  .dash-grid  { grid-template-columns:1fr; gap:12px }
}
</style>
