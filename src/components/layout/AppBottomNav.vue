<script setup>
defineProps({ active: String })
const emit = defineEmits(['navigate'])

const NAV = [
  { s: 'dashboard', icon: '🏠', label: 'Home' },
  { s: 'tasks',     icon: '✅', label: 'Tasks' },
  { s: 'habits',    icon: '🔥', label: 'Habits' },
  { s: 'calories',  icon: '🥗', label: 'Calories' },
  { s: 'workout',   icon: '💪', label: 'Workout' },
  { s: 'notes',     icon: '📝', label: 'Notes' },
  { s: 'life',      icon: '📅', label: 'Life' },
]
</script>

<template>
  <nav class="bnav">
    <div class="bnav-inner">
      <button
        v-for="n in NAV" :key="n.s"
        class="bnav-btn" :class="{ active: active === n.s }" :data-s="n.s"
        @click="emit('navigate', n.s)"
      >
        <span class="bi">{{ n.icon }}</span>{{ n.label }}
      </button>
    </div>
  </nav>
</template>
