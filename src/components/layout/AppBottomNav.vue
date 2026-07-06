<script setup>
import { computed } from 'vue'
import { DB } from '../../composables/useStore.js'
import AppIcon from '../ui/AppIcon.vue'

defineProps({ active: String })
const emit = defineEmits(['navigate'])

const ALL_NAV = [
  { s: 'dashboard', icon: 'home',         label: 'Home' },
  { s: 'tasks',     icon: 'tasks',        label: 'Tasks' },
  { s: 'habits',    icon: 'flame',        label: 'Habits' },
  { s: 'calories',  icon: 'apple',        label: 'Calories' },
  { s: 'workout',   icon: 'activity',     label: 'Workout' },
  { s: 'notes',     icon: 'note',         label: 'Notes' },
  { s: 'life',      icon: 'calendar',     label: 'Life' },
  { s: 'watchlist', icon: 'clapperboard', label: 'Watch' },
  { s: 'finance',   icon: 'wallet',       label: 'Finance' },
]

const NAV = computed(() =>
  ALL_NAV.filter(n => n.s === 'dashboard' || DB.settings.visibleSections.includes(n.s))
)
</script>

<template>
  <nav class="bnav">
    <div class="bnav-inner">
      <button
        v-for="n in NAV" :key="n.s"
        class="bnav-btn" :class="{ active: active === n.s }" :data-s="n.s"
        @click="emit('navigate', n.s)"
      >
        <span class="bi"><AppIcon :name="n.icon" :size="19" /></span>{{ n.label }}
      </button>
    </div>
  </nav>
</template>
