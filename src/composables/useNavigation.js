import { ref } from 'vue'

const VALID = ['dashboard', 'tasks', 'habits', 'calories', 'workout', 'notes', 'life', 'watchlist']

function fromHash() {
  const h = location.hash.slice(1)
  return VALID.includes(h) ? h : 'dashboard'
}

export const activeSection = ref(fromHash())

export function go(name) {
  activeSection.value = name
  location.hash = name
}

window.addEventListener('hashchange', () => {
  activeSection.value = fromHash()
})
