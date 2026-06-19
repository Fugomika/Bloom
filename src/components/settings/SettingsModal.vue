<script setup>
import { computed } from 'vue'
import { DB, ALL_SECTIONS, saveSettings } from '../../composables/useStore.js'
import { activeSection, go } from '../../composables/useNavigation.js'

defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const SECTION_META = {
  tasks:    { icon: '✅', label: 'Tasks',    grad: 'linear-gradient(135deg,#10B981,#059669)' },
  habits:   { icon: '🔥', label: 'Habits',   grad: 'linear-gradient(135deg,#F97316,#EA580C)' },
  calories: { icon: '🥗', label: 'Calories', grad: 'linear-gradient(135deg,#84CC16,#22C55E)' },
  workout:  { icon: '💪', label: 'Workout',  grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  notes:    { icon: '📝', label: 'Notes',    grad: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
  life:     { icon: '📅', label: 'Life',     grad: 'linear-gradient(135deg,#34D399,#818CF8)' },
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
  saveSettings({ visibleSections: next })
  if (!next.includes(activeSection.value)) go('dashboard')
}
</script>

<template>
  <div class="overlay" :class="{ open }" @click.self="emit('close')">
    <div class="modal smodal">
      <div class="modal-head">⚙️ Customize Bloom</div>
      <p class="smodal-sub">Show only the sections you actually use 🌻</p>

      <div class="always-on">
        <span class="ao-icon">🏠</span>
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
          <div class="stog-icon-wrap" :style="s.on ? `background:${s.grad}` : ''">
            <span class="stog-icon">{{ s.icon }}</span>
          </div>
          <span class="stog-label">{{ s.label }}</span>
          <span class="stog-check">{{ s.on ? '✓' : '' }}</span>
        </button>
      </div>

      <p class="smodal-hint">Tap a section to toggle it. Changes save instantly.</p>

      <div class="modal-foot">
        <button class="btn btn-sun" @click="emit('close')">Done ✨</button>
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
.ao-icon { font-size: 18px }
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
.stog-card:hover { transform: translateY(-2px); opacity: 1 }

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
.stog-icon { font-size: 16px }

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
</style>
