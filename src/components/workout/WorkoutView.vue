<script setup>
import { ref, computed } from 'vue'
import { DB, save } from '../../composables/useStore.js'
import { uid, today } from '../../utils/date.js'
import { MONTHS } from '../../utils/constants.js'
import { confetti } from '../../composables/useConfetti.js'

const showModal = ref(false)
const wktName = ref('')
const exRows = ref([])

const t = today()
const todayCt = computed(() => DB.workouts.filter(w => w.date === t).length)
const recentWkt = computed(() => DB.workouts.filter(w => w.date === t))
const otherWkt  = computed(() => DB.workouts.filter(w => w.date !== t).slice(0, 10))

function openModal() { wktName.value = ''; exRows.value = [newRow()]; showModal.value = true }
function closeModal() { showModal.value = false }
function newRow() { return { id: uid(), name: '', sets: '', reps: '', weight: '' } }
function addExRow() { exRows.value.push(newRow()) }
function removeRow(id) { exRows.value = exRows.value.filter(r => r.id !== id) }
function saveWorkout() {
  if (!wktName.value.trim()) return
  const exercises = exRows.value
    .filter(r => r.name.trim())
    .map(r => ({ id: uid(), name: r.name.trim(), sets: parseInt(r.sets)||0, reps: parseInt(r.reps)||0, weight: parseFloat(r.weight)||0 }))
  if (!exercises.length) return
  DB.workouts.unshift({ id: uid(), date: t, name: wktName.value.trim(), exercises, at: Date.now() })
  save(); closeModal(); confetti()
}
function delWorkout(id) { DB.workouts = DB.workouts.filter(w => w.id !== id); save() }
function exDetail(ex) {
  if (ex.sets && ex.reps && ex.weight) return `${ex.sets}×${ex.reps} @ ${ex.weight}kg`
  if (ex.sets && ex.reps) return `${ex.sets}×${ex.reps}`
  if (!ex.sets && ex.weight) return `${ex.weight} min`
  if (ex.sets) return `${ex.sets} sets`
  return ''
}
function wktDate(w) { const d = new Date(w.at); return `${MONTHS[d.getMonth()]} ${d.getDate()}` }
</script>

<template>
  <div>
    <div class="sec-head"><h1>💪 Workout Log</h1><p>Track every rep, every mile</p></div>
    <div class="wkt-top">
      <button class="btn btn-red" @click="openModal">＋ Log Workout</button>
      <span style="font-size:13px;font-weight:800;color:var(--muted)">
        {{ todayCt ? `${todayCt} workout${todayCt > 1 ? 's' : ''} logged today 💪` : 'No workouts logged today' }}
      </span>
    </div>

    <div v-if="!DB.workouts.length" class="empty">
      <span class="ee">💪</span><h3>No workouts yet</h3><p>Log your first workout above!</p>
    </div>
    <template v-else>
      <div v-if="recentWkt.length">
        <div class="section-lbl">Today</div>
        <div v-for="w in recentWkt" :key="w.id" class="wkt-card">
          <div class="wkt-head">
            <div class="wkt-icon">💪</div>
            <div>
              <div class="wkt-name">{{ w.name }}</div>
              <div class="wkt-meta">{{ wktDate(w) }} · {{ w.exercises.length }} exercise{{ w.exercises.length !== 1 ? 's' : '' }}</div>
            </div>
            <div class="wkt-actions"><button class="wkt-del" @click="delWorkout(w.id)">🗑️</button></div>
          </div>
          <div class="ex-list">
            <div v-for="ex in w.exercises" :key="ex.id" class="ex-item">
              <span class="ex-dot"></span>
              <span class="ex-iname">{{ ex.name }}</span>
              <span class="ex-detail">{{ exDetail(ex) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="otherWkt.length">
        <div class="section-lbl" :style="recentWkt.length ? 'margin-top:18px' : ''">Previous</div>
        <div v-for="w in otherWkt" :key="w.id" class="wkt-card">
          <div class="wkt-head">
            <div class="wkt-icon">💪</div>
            <div>
              <div class="wkt-name">{{ w.name }}</div>
              <div class="wkt-meta">{{ wktDate(w) }} · {{ w.exercises.length }} exercise{{ w.exercises.length !== 1 ? 's' : '' }}</div>
            </div>
            <div class="wkt-actions"><button class="wkt-del" @click="delWorkout(w.id)">🗑️</button></div>
          </div>
          <div class="ex-list">
            <div v-for="ex in w.exercises" :key="ex.id" class="ex-item">
              <span class="ex-dot"></span>
              <span class="ex-iname">{{ ex.name }}</span>
              <span class="ex-detail">{{ exDetail(ex) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal"
      @keydown="e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveWorkout() }">
      <div class="modal" style="max-width:580px">
        <div class="modal-head">Log Workout 💪</div>
        <div class="fg" style="margin-bottom:14px">
          <label>Workout Name</label>
          <input type="text" v-model="wktName" placeholder="e.g. Morning Run, Full Body Strength, Yoga…"/>
        </div>
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px">Exercises</div>
        <div v-for="row in exRows" :key="row.id" class="wex-row">
          <div class="wex-top">
            <input type="text" v-model="row.name" placeholder="Exercise (e.g. Push-ups, 5km Run…)" class="wex-name"/>
            <button class="wex-del" @click="removeRow(row.id)">✕</button>
          </div>
          <div class="wex-bot">
            <div class="fg"><label>Sets</label><input type="number" v-model="row.sets" placeholder="3" min="1" max="99"/></div>
            <div class="fg"><label>Reps</label><input type="number" v-model="row.reps" placeholder="10" min="1"/></div>
            <div class="fg"><label>kg / min</label><input type="number" v-model="row.weight" placeholder="0" min="0" step="0.5"/></div>
          </div>
        </div>
        <button class="add-ex-btn" @click="addExRow">＋ Add Exercise</button>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-red" @click="saveWorkout">Save Workout</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-lbl { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:10px }
.wkt-top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px }
.wkt-card { background:var(--surface); border-radius:var(--r); padding:18px; box-shadow:var(--sh); margin-bottom:11px; border:2px solid var(--border); animation:fadeUp .22s ease; transition:all .18s }
.wkt-card:hover { border-color:rgba(239,68,68,.2); transform:translateX(3px) }
.wkt-head { display:flex; align-items:center; gap:11px; margin-bottom:12px }
.wkt-icon { width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,#EF4444,#DC2626); display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0 }
.wkt-name { font-family:'Fredoka One',cursive; font-size:16px }
.wkt-meta { font-size:11px; font-weight:800; color:var(--muted) }
.wkt-actions { margin-left:auto }
.wkt-del { border:none; background:none; cursor:pointer; font-size:13px; color:#D1D5DB; padding:5px; border-radius:6px; transition:all .15s }
.wkt-del:hover { background:#FEE2E2; color:#DC2626 }
.ex-list { display:flex; flex-direction:column; gap:4px }
.ex-item { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:700; padding:6px 10px; background:var(--bg); border-radius:var(--r-xs) }
.ex-dot { width:6px; height:6px; border-radius:50%; background:var(--red); flex-shrink:0 }
.ex-iname { flex:1 }
.ex-detail { color:var(--muted); font-size:11px; white-space:nowrap }
.wex-row { background:var(--bg); border-radius:var(--r-xs); padding:10px; margin-bottom:7px }
.wex-top { display:flex; gap:8px; align-items:center; margin-bottom:7px }
.wex-top input { flex:1; font-size:13px; padding:7px 10px }
.wex-bot { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px }
.wex-bot .fg label { font-size:9px }
.wex-bot input { padding:6px 9px; font-size:12px; text-align:center }
.wex-del { border:none; background:rgba(239,68,68,.1); cursor:pointer; font-size:13px; color:#DC2626; padding:6px 8px; border-radius:7px; flex-shrink:0; transition:background .15s }
.wex-del:hover { background:rgba(239,68,68,.2) }
.add-ex-btn { width:100%; padding:9px; border:2px dashed rgba(0,0,0,.12); border-radius:var(--r-xs); background:none; cursor:pointer; font-family:'Nunito',sans-serif; font-weight:800; font-size:13px; color:var(--muted); transition:all .18s; margin-bottom:10px }
.add-ex-btn:hover { border-color:var(--red); color:var(--red); background:var(--red-lt) }
</style>
