<script setup>
import { computed, ref } from 'vue'
import { DB, ALL_SECTIONS } from '../../composables/useStore.js'
import AppIcon from '../ui/AppIcon.vue'
import AppMobileDrawer from './AppMobileDrawer.vue'

defineProps({ active: String })
const emit = defineEmits(['navigate'])

const NAV_META = {
  dashboard: { icon: 'home',         label: 'Home' },
  tasks:     { icon: 'tasks',        label: 'Tasks' },
  habits:    { icon: 'flame',        label: 'Habits' },
  calories:  { icon: 'apple',        label: 'Calories' },
  workout:   { icon: 'activity',     label: 'Workout' },
  notes:     { icon: 'note',         label: 'Notes' },
  life:      { icon: 'calendar',     label: 'Life' },
  watchlist: { icon: 'clapperboard', label: 'Watch' },
  finance:   { icon: 'wallet',       label: 'Finance' },
}

const showDrawer = ref(false)

const quickSections = computed(() =>
  DB.settings.mobileNavSections.filter(s => DB.settings.visibleSections.includes(s))
)

const NAV = computed(() =>
  ['dashboard', ...quickSections.value].map(s => ({ s, ...NAV_META[s] }))
)

const overflowSections = computed(() =>
  ALL_SECTIONS.filter(s => DB.settings.visibleSections.includes(s) && !quickSections.value.includes(s))
)

function navigate(s) {
  showDrawer.value = false
  emit('navigate', s)
}
</script>

<template>
  <nav class="bnav">
    <div class="bnav-inner">
      <button
        v-for="n in NAV" :key="n.s"
        class="bnav-btn" :class="{ active: active === n.s }" :data-s="n.s"
        @click="navigate(n.s)"
      >
        <span class="bi"><AppIcon :name="n.icon" :size="19" /></span>{{ n.label }}
      </button>
      <button
        v-if="overflowSections.length"
        class="bnav-btn bnav-more" :class="{ active: overflowSections.includes(active) }"
        @click="showDrawer = true"
      >
        <span class="bi"><AppIcon name="menu" :size="19" /></span>More
      </button>
    </div>
  </nav>

  <AppMobileDrawer
    :open="showDrawer"
    :sections="overflowSections"
    :meta="NAV_META"
    :active="active"
    @navigate="navigate"
    @close="showDrawer = false"
  />
</template>
