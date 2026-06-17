<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { load } from './composables/useStore.js'
import { activeSection, go } from './composables/useNavigation.js'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppBottomNav from './components/layout/AppBottomNav.vue'
import DashboardView from './components/dashboard/DashboardView.vue'
import TasksView from './components/tasks/TasksView.vue'
import HabitsView from './components/habits/HabitsView.vue'
import CaloriesView from './components/calories/CaloriesView.vue'
import WorkoutView from './components/workout/WorkoutView.vue'
import NotesView from './components/notes/NotesView.vue'
import LifeView from './components/life/LifeView.vue'

onMounted(() => {
  load()
  function handleKey(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.overlay.open').forEach(el => el.classList.remove('open'))
    }
  }
  document.addEventListener('keydown', handleKey)
  onBeforeUnmount(() => document.removeEventListener('keydown', handleKey))
})
</script>

<template>
  <AppSidebar :active="activeSection" @navigate="go" />
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
