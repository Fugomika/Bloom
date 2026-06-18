<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { user, initAuth, signOut } from './composables/useAuth.js'
import { load, loading, reset } from './composables/useStore.js'
import { activeSection, go } from './composables/useNavigation.js'
import LoginView    from './components/auth/LoginView.vue'
import AppSidebar   from './components/layout/AppSidebar.vue'
import AppBottomNav from './components/layout/AppBottomNav.vue'
import DashboardView from './components/dashboard/DashboardView.vue'
import TasksView    from './components/tasks/TasksView.vue'
import HabitsView   from './components/habits/HabitsView.vue'
import CaloriesView from './components/calories/CaloriesView.vue'
import WorkoutView  from './components/workout/WorkoutView.vue'
import NotesView    from './components/notes/NotesView.vue'
import LifeView     from './components/life/LifeView.vue'

onMounted(async () => {
  await initAuth()
  if (user.value) await load()

  function handleKey(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.overlay.open').forEach(el => el.classList.remove('open'))
    }
  }
  document.addEventListener('keydown', handleKey)
  onBeforeUnmount(() => document.removeEventListener('keydown', handleKey))
})

watch(user, async (newUser) => {
  if (newUser) {
    await load()
  } else {
    reset()
  }
})

async function handleSignOut() {
  await signOut()
}
</script>

<template>
  <!-- Not signed in -->
  <LoginView v-if="!user" />

  <!-- Signed in, loading data -->
  <div v-else-if="loading" class="app-loading">
    <div class="app-loading-inner">
      <div class="app-loading-logo">🌻</div>
      <div class="app-loading-text">Loading Bloom…</div>
    </div>
  </div>

  <!-- App -->
  <template v-else>
    <AppSidebar :active="activeSection" @navigate="go" @signout="handleSignOut" />
    <main class="main">
      <DashboardView :class="['section', activeSection === 'dashboard' ? 'active' : '']" />
      <TasksView     :class="['section', activeSection === 'tasks'     ? 'active' : '']" />
      <HabitsView    :class="['section', activeSection === 'habits'    ? 'active' : '']" />
      <CaloriesView  :class="['section', activeSection === 'calories'  ? 'active' : '']" />
      <WorkoutView   :class="['section', activeSection === 'workout'   ? 'active' : '']" />
      <NotesView     :class="['section', activeSection === 'notes'     ? 'active' : '']" />
      <LifeView      :class="['section', activeSection === 'life'      ? 'active' : '']" />
    </main>
    <AppBottomNav :active="activeSection" @navigate="go" />
  </template>
</template>

<style scoped>
.app-loading {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.app-loading-inner { text-align: center }
.app-loading-logo {
  font-size: 56px;
  animation: ldotPulse 1.6s ease-in-out infinite;
  display: block;
  margin-bottom: 16px;
}
.app-loading-text {
  font-family: 'Fredoka One', cursive;
  font-size: 22px;
  color: var(--sun-dk);
}
</style>
