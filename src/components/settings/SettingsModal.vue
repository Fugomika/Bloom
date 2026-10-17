<script setup>
import { computed } from 'vue'
import { DB, ALL_SECTIONS, MOBILE_NAV_MAX, saveSettings } from '../../composables/useStore.js'
import { activeSection, go } from '../../composables/useNavigation.js'
import AppIcon from '../ui/AppIcon.vue'

defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const SECTION_META = {
  tasks:     { icon: 'tasks',        label: 'Tasks',     grad: 'linear-gradient(135deg,#10B981,#059669)' },
  habits:    { icon: 'flame',        label: 'Habits',    grad: 'linear-gradient(135deg,#F97316,#EA580C)' },
  calories:  { icon: 'apple',        label: 'Calories',  grad: 'linear-gradient(135deg,#84CC16,#22C55E)' },
  workout:   { icon: 'activity',     label: 'Workout',   grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  notes:     { icon: 'note',         label: 'Notes',     grad: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
  life:      { icon: 'calendar',     label: 'Life',      grad: 'linear-gradient(135deg,#34D399,#818CF8)' },
  watchlist: { icon: 'clapperboard', label: 'Watchlist', grad: 'linear-gradient(135deg,#EC4899,#DB2777)' },
  finance:   { icon: 'wallet',       label: 'Finance',   grad: 'linear-gradient(135deg,#22C55E,#15803D)' },
  wardrobe:  { icon: 'shirt',        label: 'Wardrobe',  grad: 'linear-gradient(135deg,#EC4899,#BE185D)' },
}

const sections = computed(() => ALL_SECTIONS.map(s => ({
  key: s,
  ...SECTION_META[s],
  on: DB.settings.visibleSections.includes(s),
})))

function toggle(key) {
  const vis = DB.settings.visibleSections
  const next = vis.includes(key) ? vis.filter(s => s !== key) : [...vis, key]
  if (next.length === 0) return  // keep at least one section
  const updates = { visibleSections: next }
  if (!next.includes(key)) updates.mobileNavSections = DB.settings.mobileNavSections.filter(s => s !== key)
  saveSettings(updates)
  if (!next.includes(activeSection.value)) go('dashboard')
}

const mobileNavCandidates = computed(() => sections.value.filter(s => s.on))

function toggleMobileNav(key) {
  const cur = DB.settings.mobileNavSections
  if (cur.includes(key)) {
    saveSettings({ mobileNavSections: cur.filter(s => s !== key) })
  } else {
    if (cur.length >= MOBILE_NAV_MAX) return
    saveSettings({ mobileNavSections: [...cur, key] })
  }
}
</script>

<template>
  <div class="overlay" :class="{ open }" @click.self="emit('close')">
    <div class="modal smodal">
      <div class="modal-head">Customize Bloom</div>
      <p class="smodal-sub">Show only the sections you actually use</p>

      <div class="always-on">
        <span class="ao-icon"><AppIcon name="home" :size="16" /></span>
        <span class="ao-lbl">Dashboard — always visible</span>
      </div>

      <div class="stoggle-grid">
        <button
          v-for="s in sections" :key="s.key"
          class="stog-card"
          :class="{ on: s.on }"
          :style="s.on ? `--grad:${s.grad}` : ''"
          @click="toggle(s.key)"
        >
          <div class="stog-icon-wrap" :class="{ on: s.on }" :style="s.on ? `background:${s.grad}` : ''">
            <span class="stog-icon"><AppIcon :name="s.icon" :size="15" /></span>
          </div>
          <span class="stog-label">{{ s.label }}</span>
          <span class="stog-check">{{ s.on ? '✓' : '' }}</span>
        </button>
      </div>

      <p class="smodal-hint">Tap a section to toggle it. Changes save instantly.</p>

      <div class="mnav-divider"></div>

      <div class="mnav-head">
        <AppIcon name="menu" :size="15" />
        <span>Bottom Nav (Mobile)</span>
      </div>
      <p class="smodal-sub">Pick up to {{ MOBILE_NAV_MAX }} quick-access sections — the rest live in the mobile menu</p>

      <div class="stoggle-grid">
        <button
          v-for="s in mobileNavCandidates" :key="s.key"
          class="stog-card mnav-card"
          :class="{ on: DB.settings.mobileNavSections.includes(s.key) }"
          :style="DB.settings.mobileNavSections.includes(s.key) ? `--grad:${s.grad}` : ''"
          @click="toggleMobileNav(s.key)"
        >
          <div class="stog-icon-wrap" :class="{ on: DB.settings.mobileNavSections.includes(s.key) }" :style="DB.settings.mobileNavSections.includes(s.key) ? `background:${s.grad}` : ''">
            <span class="stog-icon"><AppIcon :name="s.icon" :size="15" /></span>
          </div>
          <span class="stog-label">{{ s.label }}</span>
          <span class="stog-check">{{ DB.settings.mobileNavSections.includes(s.key) ? '✓' : '' }}</span>
        </button>
      </div>

      <div class="modal-foot">
        <button class="btn btn-sun" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smodal { max-width: 440px }

.smodal-sub {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  margin: -6px 0 18px;
}

.always-on {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--bg);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  margin-bottom: 16px;
  border: 2px dashed var(--border);
}
.ao-icon { display: flex; color: var(--muted) }
.ao-lbl  { font-size: 12px; font-weight: 800; color: var(--muted) }

.stoggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.stog-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r);
  border: 2px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all .2s;
  position: relative;
  overflow: hidden;
  font-family: 'Nunito', sans-serif;
}
.stog-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--grad, transparent);
  opacity: 0;
  transition: opacity .2s;
}
.stog-card.on::before { opacity: .08 }
.stog-card.on {
  border-color: transparent;
  box-shadow: 0 2px 12px rgba(0,0,0,.1);
}
.stog-card:not(.on) { opacity: .5 }
.stog-card:hover { opacity: 1 }
@media (hover:hover) and (pointer:fine) {
  .stog-card:hover { transform: translateY(-2px) }
}

.stog-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.07);
  flex-shrink: 0;
  transition: background .2s;
  position: relative;
  z-index: 1;
}
.stog-icon { display: flex; color: var(--muted) }
.stog-icon-wrap.on .stog-icon { color: #fff }

.stog-label {
  flex: 1;
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
  position: relative;
  z-index: 1;
}

.stog-check {
  font-size: 13px;
  font-weight: 900;
  color: var(--leaf);
  width: 16px;
  text-align: center;
  position: relative;
  z-index: 1;
}

.smodal-hint {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-align: center;
  margin: 0 0 4px;
}

.mnav-divider {
  height: 1px;
  background: var(--border);
  margin: 18px 0 16px;
}

.mnav-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 4px;
}
.mnav-card:not(.on) { opacity: .4 }
</style>
