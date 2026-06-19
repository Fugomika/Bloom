<script setup>
import { computed, ref } from 'vue'
import { MONTHS } from '../../utils/constants.js'
import { DB } from '../../composables/useStore.js'
import SettingsModal from '../settings/SettingsModal.vue'

defineProps({ active: String })
const emit = defineEmits(['navigate', 'signout'])

const now = new Date()
const dayNum = now.getDate()
const monthYear = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`

const showSettings = ref(false)

const ALL_NAV = [
  { s: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { s: 'tasks',     icon: '✅', label: 'Tasks' },
  { s: 'habits',    icon: '🔥', label: 'Habits' },
  { s: 'calories',  icon: '🥗', label: 'Calories' },
  { s: 'workout',   icon: '💪', label: 'Workout' },
  { s: 'notes',     icon: '📝', label: 'Notes' },
  { s: 'life',      icon: '📅', label: 'Life' },
]

const NAV = computed(() =>
  ALL_NAV.filter(n => n.s === 'dashboard' || DB.settings.visibleSections.includes(n.s))
)
</script>

<template>
  <aside class="sidebar">
    <div class="logo"><span>🌻</span><span class="logo-text">Bloom</span></div>
    <div class="nav-lbl">Menu</div>
    <button
      v-for="n in NAV" :key="n.s"
      class="nav-btn" :class="{ active: active === n.s }" :data-s="n.s"
      @click="emit('navigate', n.s)"
    >
      <div class="nav-icon">{{ n.icon }}</div>
      <span>{{ n.label }}</span>
    </button>

    <div class="sidebar-foot">
      <div class="date-chip">
        <div class="big">{{ dayNum }}</div>
        <div class="lbl" style="opacity:.6;font-size:11px;margin-top:1px">{{ monthYear }}</div>
      </div>
      <button class="foot-btn" @click="showSettings = true" title="Customize">
        <span class="nav-icon" style="background:rgba(255,255,255,.08)">⚙️</span>
        <span>Customize</span>
      </button>
      <button class="foot-btn signout-btn" @click="emit('signout')" title="Sign out">
        <span class="nav-icon" style="background:rgba(255,255,255,.08)">🚪</span>
        <span>Sign out</span>
      </button>
    </div>
  </aside>

  <SettingsModal :open="showSettings" @close="showSettings = false" />
</template>

<style scoped>
.sidebar { width:228px; height:100vh; background:var(--sidebar); display:flex; flex-direction:column; padding:18px 10px; flex-shrink:0; z-index:20; overflow-y:auto }
.logo { display:flex; align-items:center; gap:10px; padding:6px 12px 20px; font-family:'Fredoka One',cursive; font-size:25px; color:#fff }
.logo-text { background:linear-gradient(135deg,#FBBF24 0%,#F59E0B 60%,#D97706 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text }
.nav-lbl { font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.22); padding:0 12px; margin:4px 0 5px }
.nav-btn { width:100%; display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:var(--r-sm); border:none; background:none; cursor:pointer; color:rgba(255,255,255,.48); font-family:'Nunito',sans-serif; font-size:13.5px; font-weight:700; margin-bottom:2px; text-align:left; transition:all .18s }
.nav-btn:hover { background:var(--sidebar-hover); color:rgba(255,255,255,.8) }
.nav-btn.active { background:var(--sidebar-active); color:#fff }
.nav-icon { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0 }
.nav-btn[data-s="dashboard"] .nav-icon { background:linear-gradient(135deg,#FBBF24,#F59E0B) }
.nav-btn[data-s="tasks"]     .nav-icon { background:linear-gradient(135deg,#10B981,#059669) }
.nav-btn[data-s="habits"]    .nav-icon { background:linear-gradient(135deg,#F97316,#EA580C) }
.nav-btn[data-s="calories"]  .nav-icon { background:linear-gradient(135deg,#84CC16,#22C55E) }
.nav-btn[data-s="workout"]   .nav-icon { background:linear-gradient(135deg,#EF4444,#DC2626) }
.nav-btn[data-s="notes"]     .nav-icon { background:linear-gradient(135deg,#8B5CF6,#7C3AED) }
.nav-btn[data-s="life"]      .nav-icon { background:linear-gradient(135deg,#34D399,#818CF8) }
.sidebar-foot { margin-top:auto; padding:10px; display:flex; flex-direction:column; gap:6px }
.foot-btn { width:100%; display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:var(--r-sm); border:none; background:none; cursor:pointer; color:rgba(255,255,255,.38); font-family:'Nunito',sans-serif; font-size:13.5px; font-weight:700; text-align:left; transition:all .18s }
.foot-btn:hover { background:var(--sidebar-hover); color:rgba(255,255,255,.7) }
.signout-btn:hover { background:rgba(239,68,68,.18) !important; color:rgba(255,100,100,.9) !important }
.date-chip { background:rgba(255,255,255,.06); border-radius:var(--r-sm); padding:12px; color:rgba(255,255,255,.6); font-size:12px; font-weight:700 }
.date-chip .big { font-family:'Fredoka One',cursive; font-size:28px; color:#fff; line-height:1 }

@media(max-width:960px) {
  .sidebar { width:56px; padding:14px 6px }
  .logo span:not(:first-child), .nav-btn > span:not(.nav-icon), .foot-btn > span:not(.nav-icon), .lbl, .nav-lbl { display:none }
  .nav-btn { justify-content:center; padding:9px }
  .foot-btn { justify-content:center; padding:9px }
  .logo { padding:6px 2px 18px; justify-content:center }
}
@media(max-width:600px) { .sidebar { display:none } }
</style>
