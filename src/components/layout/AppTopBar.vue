<script setup>
import { computed, ref } from 'vue'
import { activeSection } from '../../composables/useNavigation.js'
import SettingsModal from '../settings/SettingsModal.vue'
import BloomLogo from '../ui/BloomLogo.vue'
import AppIcon from '../ui/AppIcon.vue'

const TITLES = {
  dashboard: 'Dashboard', tasks: 'Tasks', habits: 'Habits',
  calories: 'Calories', workout: 'Workout', notes: 'Notes',
  life: 'Life', watchlist: 'Watchlist', finance: 'Finance',
}
const title = computed(() => TITLES[activeSection.value] || 'Bloom')

const showSettings = ref(false)
</script>

<template>
  <header class="topbar">
    <div class="tb-brand">
      <BloomLogo :size="24" />
      <span class="tb-title">{{ title }}</span>
    </div>
    <button class="tb-action" aria-label="Customize" @click="showSettings = true">
      <AppIcon name="sliders" :size="18" />
    </button>
  </header>

  <SettingsModal :open="showSettings" @close="showSettings = false" />
</template>

<style scoped>
.topbar {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 90;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 54px;
  padding: 0 16px;
  padding-top: env(safe-area-inset-top, 0);
  box-sizing: content-box;
  background: var(--sidebar);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.tb-brand { display: flex; align-items: center; gap: 9px; min-width: 0 }
.tb-title {
  font-family: 'Fredoka One', cursive;
  font-size: 19px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb-action {
  flex-shrink: 0;
  width: 40px; height: 40px;
  border: none; border-radius: 12px;
  background: rgba(255,255,255,.08);
  color: var(--sun);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background .15s;
}
.tb-action:active { background: rgba(255,255,255,.16) }

@media (max-width: 600px) {
  .topbar { display: flex }
}
</style>
