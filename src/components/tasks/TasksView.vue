<script setup>
import { ref, computed } from 'vue'
import { DB, save } from '../../composables/useStore.js'
import { uid, today, fmtDate, overdue } from '../../utils/date.js'
import { confetti } from '../../composables/useConfetti.js'

const tFilter = ref('all')
const tInput = ref('')
const tPri = ref('medium')
const tDue = ref('')

const filtered = computed(() => {
  if (tFilter.value === 'active') return DB.tasks.filter(x => !x.done)
  if (tFilter.value === 'done')   return DB.tasks.filter(x => x.done)
  return DB.tasks
})

function addTask() {
  if (!tInput.value.trim()) return
  DB.tasks.unshift({ id: uid(), title: tInput.value.trim(), pri: tPri.value, due: tDue.value, done: false, at: Date.now() })
  tInput.value = ''; tDue.value = ''
  save()
}
function toggleTask(id) {
  const t = DB.tasks.find(x => x.id === id)
  if (t) { t.done = !t.done; if (t.done) confetti(); save() }
}
function delTask(id) { DB.tasks = DB.tasks.filter(x => x.id !== id); save() }
function setFilter(f) { tFilter.value = f }
</script>

<template>
  <div>
    <div class="sec-head"><h1>📋 My Tasks</h1><p>Stay on top of what matters</p></div>

    <div class="card" style="margin-bottom:16px">
      <div class="form-row">
        <div class="fg" style="flex:2;min-width:180px">
          <label>Task</label>
          <input type="text" v-model="tInput" placeholder="What needs to be done? ✨" @keydown.enter="addTask"/>
        </div>
        <div class="fg">
          <label>Priority</label>
          <select v-model="tPri">
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <div class="fg"><label>Due Date</label><input type="date" v-model="tDue"/></div>
      </div>
      <button class="btn btn-sun" @click="addTask">＋ Add Task</button>
    </div>

    <div class="ftabs">
      <button class="ftab" :class="{ active: tFilter === 'all' }"    @click="setFilter('all')">All</button>
      <button class="ftab" :class="{ active: tFilter === 'active' }" @click="setFilter('active')">Active</button>
      <button class="ftab" :class="{ active: tFilter === 'done' }"   @click="setFilter('done')">Done ✓</button>
    </div>

    <div class="task-list">
      <template v-if="filtered.length">
        <div v-for="x in filtered" :key="x.id" class="task-item" :class="{ done: x.done }">
          <div class="chk" :class="{ on: x.done }" @click="toggleTask(x.id)">{{ x.done ? '✓' : '' }}</div>
          <span class="task-title">{{ x.title }}</span>
          <span v-if="x.due" class="due" :class="{ late: overdue(x.due) && !x.done }">📅 {{ fmtDate(x.due) }}</span>
          <span class="badge" :class="`b-${x.pri}`">{{ x.pri }}</span>
          <button class="del-btn" @click="delTask(x.id)">🗑️</button>
        </div>
      </template>
      <div v-else class="empty">
        <span class="ee">{{ tFilter === 'done' ? '🎊' : '🌟' }}</span>
        <h3>{{ tFilter === 'done' ? 'Nothing done yet' : 'No tasks here!' }}</h3>
        <p>{{ tFilter === 'done' ? 'Complete tasks to see them' : 'Add your first task above ↑' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-list { display:flex; flex-direction:column; gap:8px }
.task-item { background:var(--surface); border-radius:var(--r-sm); padding:12px 16px; display:flex; align-items:center; gap:12px; box-shadow:var(--sh); border:2px solid transparent; transition:all .18s; animation:fadeUp .22s ease }
.task-item:hover { border-color:var(--sun-lt); transform:translateX(3px) }
.task-item.done { opacity:.55 }
.task-item.done .task-title { text-decoration:line-through }
.chk { width:22px; height:22px; border-radius:7px; border:2.5px solid #D1D5DB; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; transition:all .18s; user-select:none }
.chk:hover:not(.on) { border-color:var(--sun); background:var(--sun-lt) }
.chk.on { background:var(--sun); border-color:var(--sun); color:#1A0E00; font-weight:900 }
.task-title { flex:1; font-weight:700; font-size:14px }
.due { font-size:11px; font-weight:800; color:var(--muted); white-space:nowrap }
.due.late { color:#DC2626 }
.del-btn { opacity:0; border:none; background:none; cursor:pointer; font-size:14px; color:var(--muted); padding:4px 6px; border-radius:6px; transition:all .15s; flex-shrink:0 }
.task-item:hover .del-btn { opacity:1 }
.del-btn:hover { background:#FEE2E2; color:#DC2626 }
</style>
