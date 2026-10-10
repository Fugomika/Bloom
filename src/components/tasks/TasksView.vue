<script setup>
import { ref, computed } from 'vue'
import { DB, addTask as storeAddTask, updateTask, deleteTask } from '../../composables/useStore.js'
import { uid, fmtDate, overdue, today } from '../../utils/date.js'
import { confetti } from '../../composables/useConfetti.js'
import AppIcon from '../ui/AppIcon.vue'

const tFilter = ref('all')
const tInput = ref('')
const tPri = ref('medium')
const tDue = ref(today())
const tBacklog = ref(false)

const fDate = ref(today())

const todayCount   = computed(() => DB.tasks.filter(x => x.due === today() && !x.done).length)
const backlogCount = computed(() => DB.tasks.filter(x => !x.due && !x.done).length)

const filtered = computed(() => {
  if (tFilter.value === 'active')  return DB.tasks.filter(x => !x.done)
  if (tFilter.value === 'done')    return DB.tasks.filter(x => x.done)
  if (tFilter.value === 'today')   return DB.tasks.filter(x => x.due === today())
  if (tFilter.value === 'date')    return DB.tasks.filter(x => x.due === fDate.value)
  if (tFilter.value === 'backlog') return DB.tasks.filter(x => !x.due)
  return DB.tasks
})

function addTask() {
  if (!tInput.value.trim()) return
  const due = tBacklog.value ? '' : tDue.value
  storeAddTask({ id: uid(), title: tInput.value.trim(), pri: tPri.value, due, done: false, at: Date.now() })
  tInput.value = ''; tDue.value = today(); tBacklog.value = false
}
function toggleTask(id) {
  const t = DB.tasks.find(x => x.id === id)
  if (t) { const done = !t.done; if (done) confetti(); updateTask(id, { done }) }
}
function delTask(id) { deleteTask(id) }
function setFilter(f) { tFilter.value = f }

const EMPTY = {
  all:     { ee: '🌟', h: 'No tasks here!',      p: 'Add your first task above ↑' },
  active:  { ee: '🌟', h: 'Nothing active',      p: 'All caught up — nice work!' },
  today:   { ee: '☀️', h: 'Nothing due today',   p: 'Enjoy the breathing room, or pull one from backlog' },
  date:    { ee: '📅', h: 'Nothing on this day', p: 'Pick another date, or add a task for it above ↑' },
  backlog: { ee: '📥', h: 'Backlog is empty',    p: 'Tasks added without a due date land here' },
  done:    { ee: '🎊', h: 'Nothing done yet',    p: 'Complete tasks to see them' },
}
</script>

<template>
  <div>
    <div class="sec-head"><h1>My Tasks</h1><p>Stay on top of what matters</p></div>

    <div class="card" style="margin-bottom:16px">
      <div class="form-row">
        <div class="fg" style="flex:2;min-width:180px">
          <label>Task</label>
          <input type="text" v-model="tInput" placeholder="What needs to be done?" @keydown.enter="addTask"/>
        </div>
        <div class="fg">
          <label>Priority</label>
          <select v-model="tPri">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="fg">
          <label>Due Date</label>
          <div class="due-row">
            <input type="date" v-model="tDue" :disabled="tBacklog"/>
            <button class="backlog-toggle" :class="{ on: tBacklog }" @click="tBacklog = !tBacklog"
                    title="No due date — send to backlog">📥 Backlog</button>
          </div>
        </div>
      </div>
      <button class="btn btn-sun" @click="addTask">＋ Add Task</button>
    </div>

    <div class="ftabs">
      <button class="ftab" :class="{ active: tFilter === 'all' }"     @click="setFilter('all')">All</button>
      <button class="ftab" :class="{ active: tFilter === 'active' }"  @click="setFilter('active')">Active</button>
      <button class="ftab" :class="{ active: tFilter === 'today' }"   @click="setFilter('today')">☀️ Today{{ todayCount ? ` (${todayCount})` : '' }}</button>
      <button class="ftab" :class="{ active: tFilter === 'date' }"    @click="setFilter('date')">📅 By Date</button>
      <button class="ftab" :class="{ active: tFilter === 'backlog' }" @click="setFilter('backlog')">📥 Backlog{{ backlogCount ? ` (${backlogCount})` : '' }}</button>
      <button class="ftab" :class="{ active: tFilter === 'done' }"    @click="setFilter('done')">Done ✓</button>
    </div>

    <div v-if="tFilter === 'date'" class="date-bar">
      <label>Showing tasks due on</label>
      <input type="date" v-model="fDate"/>
      <button class="date-today" @click="fDate = today()">Today</button>
    </div>

    <div class="task-list">
      <template v-if="filtered.length">
        <div v-for="x in filtered" :key="x.id" class="task-item" :class="{ done: x.done }">
          <div class="chk" :class="{ on: x.done }" @click="toggleTask(x.id)">{{ x.done ? '✓' : '' }}</div>
          <span class="task-title">{{ x.title }}</span>
          <span v-if="x.due" class="due" :class="{ late: overdue(x.due) && !x.done }"><AppIcon name="calendar" :size="11" /> {{ fmtDate(x.due) }}</span>
          <span v-else class="due backlog-chip">📥 Backlog</span>
          <span class="badge" :class="`b-${x.pri}`">{{ x.pri }}</span>
          <button class="del-btn" @click="delTask(x.id)"><AppIcon name="trash" :size="14" /></button>
        </div>
      </template>
      <div v-else class="empty">
        <span class="ee">{{ EMPTY[tFilter].ee }}</span>
        <h3>{{ EMPTY[tFilter].h }}</h3>
        <p>{{ EMPTY[tFilter].p }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.due-row { display:flex; gap:6px; align-items:center }
.due-row input[type=date] { flex:1; min-width:0 }
.due-row input:disabled { opacity:.4 }
.backlog-toggle {
  flex-shrink:0; padding:9px 12px; border-radius:var(--r-sm); white-space:nowrap;
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted);
  transition:all .18s;
}
.backlog-toggle:hover { border-color:var(--sun); color:var(--sun-dk) }
.backlog-toggle.on    { border-color:var(--sun); background:rgba(251,191,36,.12); color:var(--sun-dk) }

.date-bar {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  background:var(--surface); border:2px solid var(--border); border-radius:var(--r-sm);
  padding:10px 14px; margin-top:12px; animation:fadeUp .2s ease;
}
.date-bar label { font-size:12px; font-weight:800; color:var(--muted) }
.date-bar input[type=date] { width:auto }
.date-today {
  padding:6px 12px; border-radius:var(--r-sm); border:2px solid var(--sun);
  background:rgba(251,191,36,.1); cursor:pointer;
  font-family:'Nunito',sans-serif; font-size:12px; font-weight:900; color:var(--sun-dk);
  transition:all .15s;
}
.date-today:hover { background:rgba(251,191,36,.22) }

.backlog-chip { color:var(--muted); opacity:.75 }

.task-list { display:flex; flex-direction:column; gap:8px }
.task-item { background:var(--surface); border-radius:var(--r-sm); padding:12px 16px; display:flex; align-items:center; gap:12px; box-shadow:var(--sh); border:2px solid transparent; transition:all .18s; animation:fadeUp .22s ease }
.task-item:hover { border-color:var(--sun-lt) }
@media (hover:hover) and (pointer:fine) {
  .task-item:hover { transform:translateX(3px) }
}
.task-item.done { opacity:.55 }
.task-item.done .task-title { text-decoration:line-through }
.chk { width:22px; height:22px; border-radius:7px; border:2.5px solid #D1D5DB; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; transition:all .18s; user-select:none }
.chk:hover:not(.on) { border-color:var(--sun); background:var(--sun-lt) }
.chk.on { background:var(--sun); border-color:var(--sun); color:#1A0E00; font-weight:900 }
.task-title { flex:1; font-weight:700; font-size:14px }
.due { font-size:11px; font-weight:800; color:var(--muted); white-space:nowrap; display:inline-flex; align-items:center; gap:4px }
.due.late { color:#DC2626 }
.del-btn { opacity:0; border:none; background:none; cursor:pointer; color:var(--muted); padding:8px; border-radius:6px; transition:all .15s; flex-shrink:0; display:flex; align-items:center }
.task-item:hover .del-btn { opacity:1 }
.del-btn:hover { background:#FEE2E2; color:#DC2626 }
/* touch devices have no hover — keep delete visible so items stay deletable */
@media (hover: none) { .del-btn { opacity:.55 } }
</style>
