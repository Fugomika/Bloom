<script setup>
import { ref, computed } from 'vue'
import { DB, addMeal as storeAddMeal, deleteMeal as storeDeleteMeal, saveSettings, todayMeals } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'
import { MEAL_LABELS } from '../../utils/constants.js'

const showModal = ref(false)
const calName = ref('')
const calKcal = ref('')
const calType = ref('breakfast')

const meals = computed(() => todayMeals())
const kcal  = computed(() => meals.value.reduce((s, m) => s + m.cal, 0))
const goal  = computed(() => DB.settings.calorieGoal)
const remain = computed(() => goal.value - kcal.value)
const pct   = computed(() => Math.min(kcal.value / goal.value, 1))
const C = 376.99

const ringColor = computed(() => {
  if (kcal.value > goal.value) return '#EF4444'
  if (kcal.value > goal.value * 0.9) return '#F59E0B'
  return '#22C55E'
})

function openModal() { calName.value = ''; calKcal.value = ''; calType.value = 'breakfast'; showModal.value = true }
function closeModal() { showModal.value = false }
function saveMeal() {
  const name = calName.value.trim()
  const cal = parseInt(calKcal.value) || 0
  if (!name || cal <= 0) return
  storeAddMeal({ id: uid(), name, cal, type: calType.value, at: Date.now() })
  closeModal()
}
function delMeal(id) { storeDeleteMeal(id) }
function editGoal() {
  const v = prompt(`Daily calorie goal (current: ${goal.value} kcal):`, goal.value)
  const n = parseInt(v)
  if (n && n > 0 && n < 10000) saveSettings({ calorieGoal: n })
}

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
</script>

<template>
  <div>
    <div class="sec-head"><h1>🥗 Calorie Tracker</h1><p>Fuel your body right</p></div>

    <div class="card" style="margin-bottom:18px">
      <div class="cal-top">
        <div class="cal-ring-wrap">
          <svg viewBox="0 0 148 148" width="148" height="148">
            <circle cx="74" cy="74" r="60" fill="none" stroke="#FEF3C7" stroke-width="11"/>
            <circle cx="74" cy="74" r="60" fill="none" :stroke="ringColor" stroke-width="11"
              :stroke-dasharray="C" :stroke-dashoffset="C * (1 - pct)"
              stroke-linecap="round" transform="rotate(-90 74 74)" style="transition:stroke-dashoffset .6s ease,stroke .4s"/>
          </svg>
          <div class="ring-center">
            <div class="ring-num">{{ kcal.toLocaleString() }}</div>
            <div class="ring-sub">kcal eaten</div>
          </div>
        </div>
        <div class="cal-stats">
          <h2>{{ kcal.toLocaleString() }} / {{ goal.toLocaleString() }} kcal</h2>
          <div class="cal-chips">
            <span class="ccip ccip-eaten">{{ kcal.toLocaleString() }} eaten</span>
            <span class="ccip" :class="remain >= 0 ? 'ccip-remain' : 'ccip-over'">
              {{ remain >= 0 ? `${remain.toLocaleString()} left` : `${Math.abs(remain).toLocaleString()} over!` }}
            </span>
            <span class="ccip ccip-goal" @click="editGoal">⚙️ Goal: {{ goal.toLocaleString() }} kcal</span>
          </div>
        </div>
      </div>
      <button class="btn btn-leaf" @click="openModal">＋ Log Food</button>
    </div>

    <div v-if="!meals.length" class="empty">
      <span class="ee">🥗</span><h3>No food logged yet</h3><p>Tap "+ Log Food" to add your first meal</p>
    </div>
    <template v-else>
      <div v-for="type in ORDER" :key="type">
        <div v-if="meals.filter(m => m.type === type).length" class="meal-group">
          <div class="meal-group-head">
            <span>{{ MEAL_LABELS[type] }}</span>
            <span class="meal-group-cal">{{ meals.filter(m => m.type === type).reduce((s, m) => s + m.cal, 0).toLocaleString() }} kcal</span>
          </div>
          <div v-for="m in meals.filter(x => x.type === type)" :key="m.id" class="meal-item">
            <span class="meal-name">{{ m.name }}</span>
            <span class="meal-cal">{{ m.cal.toLocaleString() }}</span>
            <button class="meal-del" @click="delMeal(m.id)">✕</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal"
      @keydown="e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveMeal() }">
      <div class="modal">
        <div class="modal-head">Log Food 🥗</div>
        <div class="form-row">
          <div class="fg" style="flex:2"><label>Food / Meal</label><input type="text" v-model="calName" placeholder="e.g. Chicken Rice, Banana…" @keydown.enter="saveMeal"/></div>
          <div class="fg"><label>Calories (kcal)</label><input type="number" v-model="calKcal" placeholder="350" min="0" max="9999"/></div>
        </div>
        <div class="fg" style="margin-bottom:4px">
          <label>Meal Type</label>
          <select v-model="calType">
            <option value="breakfast">🌅 Breakfast</option>
            <option value="lunch">☀️ Lunch</option>
            <option value="dinner">🌙 Dinner</option>
            <option value="snack">🍎 Snack</option>
          </select>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-leaf" @click="saveMeal">Add Food</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cal-top { display:flex; gap:24px; align-items:center; flex-wrap:wrap; margin-bottom:22px }
.cal-ring-wrap { position:relative; width:148px; height:148px; flex-shrink:0 }
.ring-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center }
.ring-num { font-family:'Fredoka One',cursive; font-size:28px; line-height:1; color:var(--sun-dk) }
.ring-sub { font-size:10px; font-weight:900; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-top:2px }
.cal-stats { flex:1; min-width:180px }
.cal-stats h2 { font-family:'Fredoka One',cursive; font-size:26px }
.cal-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px }
.ccip { padding:5px 12px; border-radius:20px; font-size:12px; font-weight:900 }
.ccip-eaten  { background:var(--sun-lt); color:var(--sun-dk) }
.ccip-remain { background:var(--leaf-lt); color:var(--leaf-dk) }
.ccip-over   { background:var(--red-lt); color:#DC2626 }
.ccip-goal   { background:rgba(0,0,0,.05); color:var(--muted); cursor:pointer }
.ccip-goal:hover { background:rgba(0,0,0,.09) }
.meal-group { margin-bottom:18px }
.meal-group-head { font-family:'Fredoka One',cursive; font-size:16px; display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:2px solid var(--border); margin-bottom:7px }
.meal-group-cal { font-size:12px; font-weight:800; color:var(--muted) }
.meal-item { display:flex; align-items:center; gap:11px; padding:9px 13px; background:var(--surface); border-radius:var(--r-sm); margin-bottom:5px; box-shadow:var(--sh); transition:all .18s; animation:fadeUp .2s ease }
.meal-item:hover { transform:translateX(2px) }
.meal-name { flex:1; font-weight:700; font-size:13px }
.meal-cal { font-family:'Fredoka One',cursive; font-size:14px; color:var(--sun-dk) }
.meal-del { opacity:0; border:none; background:none; cursor:pointer; font-size:12px; color:var(--muted); padding:3px 5px; border-radius:5px; transition:all .15s }
.meal-item:hover .meal-del { opacity:1 }
.meal-del:hover { background:#FEE2E2; color:#DC2626 }
@media(max-width:600px) { .cal-top { flex-direction:column; align-items:flex-start } }
</style>
