<script setup>
import { ref } from 'vue'
import { DB, addHabit as storeAddHabit, updateHabitIns, deleteHabit } from '../../composables/useStore.js'
import { uid, today, streak, last7 } from '../../utils/date.js'
import { confetti } from '../../composables/useConfetti.js'
import { EMOJIS, DLBL } from '../../utils/constants.js'
import EmojiPicker from '../ui/EmojiPicker.vue'

const hInput = ref('')
const hColor = ref('pink')
const selEmoji = ref(EMOJIS[0])

function addHabit() {
  if (!hInput.value.trim()) return
  storeAddHabit({ id: uid(), name: hInput.value.trim(), emoji: selEmoji.value, color: hColor.value, ins: [], at: Date.now() })
  hInput.value = ''
}
function checkin(id) {
  const h = DB.habits.find(x => x.id === id), t = today()
  if (!h) return
  const newIns = h.ins.includes(t) ? h.ins.filter(d => d !== t) : [...h.ins, t]
  if (!h.ins.includes(t)) confetti()
  updateHabitIns(id, newIns)
}
function delHabit(id) { deleteHabit(id) }

const t = today()
const w = last7()
</script>

<template>
  <div>
    <div class="sec-head"><h1>🔥 My Habits</h1><p>Build streaks, build yourself</p></div>

    <div class="card" style="margin-bottom:18px">
      <div class="widget-title" style="margin-bottom:12px">Add New Habit</div>
      <div class="form-row">
        <div class="fg" style="flex:2">
          <label>Habit Name</label>
          <input type="text" v-model="hInput" placeholder="e.g. Morning Run, Drink Water…" @keydown.enter="addHabit"/>
        </div>
        <div class="fg">
          <label>Color</label>
          <select v-model="hColor">
            <option value="pink">🌻 Sunflower</option>
            <option value="teal">🌿 Green</option>
            <option value="orange">🧡 Coral</option>
            <option value="lime">💚 Lime</option>
            <option value="purple">💜 Purple</option>
          </select>
        </div>
      </div>
      <div class="fg" style="margin-bottom:12px">
        <label>Emoji</label>
        <EmojiPicker :emojis="EMOJIS" v-model="selEmoji" variant="habit" />
      </div>
      <button class="btn btn-sun" @click="addHabit">＋ Add Habit</button>
    </div>

    <div class="habits-grid">
      <template v-if="DB.habits.length">
        <div v-for="h in DB.habits" :key="h.id" class="habit-card" :class="`hc-${h.color}`">
          <div class="habit-head">
            <div class="h-emoji-wrap">{{ h.emoji }}</div>
            <div style="flex:1">
              <div class="h-name">{{ h.name }}</div>
              <div class="streak-row">
                {{ streak(h.ins) >= 7 ? '🏆' : streak(h.ins) >= 3 ? '🔥' : '✨' }}
                <span class="streak-num">{{ streak(h.ins) }}</span> day streak
              </div>
            </div>
            <button class="habit-del" @click="delHabit(h.id)">✕</button>
          </div>
          <div class="week-row">
            <div v-for="d in w" :key="d" class="wd-col">
              <span class="wd-lbl">{{ DLBL[new Date(d + 'T00:00:00').getDay()] }}</span>
              <div class="dot" :class="{ on: h.ins.includes(d), today: d === t }"></div>
            </div>
          </div>
          <button class="cin-btn" :class="{ on: h.ins.includes(t) }" @click="checkin(h.id)">
            {{ h.ins.includes(t) ? '✓ Done today!' : '+ Check In' }}
          </button>
        </div>
      </template>
      <div v-else class="empty" style="grid-column:1/-1">
        <span class="ee">🌱</span><h3>No habits yet</h3><p>Add your first habit above!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.habits-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:13px }
.habit-card { background:var(--surface); border-radius:var(--r); padding:18px; box-shadow:var(--sh); border:2px solid var(--border); transition:all .2s; animation:fadeUp .22s ease }
.habit-card:hover { transform:translateY(-5px); box-shadow:var(--sh-md) }
.habit-head { display:flex; align-items:flex-start; gap:11px; margin-bottom:13px }
.h-emoji-wrap { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0 }
.h-name { font-family:'Fredoka One',cursive; font-size:16px }
.streak-row { display:flex; align-items:center; gap:4px; font-size:12px; font-weight:800; margin-top:2px }
.streak-num { font-family:'Fredoka One',cursive; font-size:14px }
.week-row { display:flex; gap:4px; margin-bottom:12px }
.wd-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px }
.wd-lbl { font-size:9px; font-weight:900; color:var(--muted); text-transform:uppercase }
.dot { width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,.06); transition:background .2s }
.dot.today { outline:2.5px solid var(--sun); outline-offset:2px }
.cin-btn { width:100%; padding:8px; border-radius:9px; border:2.5px solid rgba(0,0,0,.1); background:transparent; font-family:'Nunito',sans-serif; font-weight:900; font-size:12.5px; cursor:pointer; transition:all .18s; color:var(--text) }
.habit-del { background:none; border:none; cursor:pointer; font-size:13px; color:#D1D5DB; padding:4px; border-radius:6px; transition:all .15s; flex-shrink:0 }
.habit-del:hover { background:#FEE2E2; color:#DC2626 }
/* habit color themes */
.hc-purple .h-emoji-wrap { background:#EDE9FE } .hc-purple .dot.on { background:#8B5CF6 } .hc-purple .cin-btn.on { background:#8B5CF6;border-color:#8B5CF6;color:#fff } .hc-purple .cin-btn:hover:not(.on) { border-color:#8B5CF6;color:#8B5CF6;background:#EDE9FE }
.hc-pink   .h-emoji-wrap { background:var(--sun-lt) } .hc-pink   .dot.on { background:var(--sun) } .hc-pink   .cin-btn.on { background:var(--sun);border-color:var(--sun);color:#1A0E00 } .hc-pink   .cin-btn:hover:not(.on) { border-color:var(--sun);color:var(--sun-dk);background:var(--sun-lt) }
.hc-teal   .h-emoji-wrap { background:var(--leaf-lt) } .hc-teal   .dot.on { background:var(--leaf) } .hc-teal   .cin-btn.on { background:var(--leaf);border-color:var(--leaf);color:#fff } .hc-teal   .cin-btn:hover:not(.on) { border-color:var(--leaf);color:var(--leaf);background:var(--leaf-lt) }
.hc-orange .h-emoji-wrap { background:var(--coral-lt) } .hc-orange .dot.on { background:var(--coral) } .hc-orange .cin-btn.on { background:var(--coral);border-color:var(--coral);color:#fff } .hc-orange .cin-btn:hover:not(.on) { border-color:var(--coral);color:var(--coral);background:var(--coral-lt) }
.hc-lime   .h-emoji-wrap { background:#ECFCCB } .hc-lime   .dot.on { background:#84CC16 } .hc-lime   .cin-btn.on { background:#84CC16;border-color:#84CC16;color:#fff } .hc-lime   .cin-btn:hover:not(.on) { border-color:#84CC16;color:#65A30D;background:#ECFCCB }
</style>
