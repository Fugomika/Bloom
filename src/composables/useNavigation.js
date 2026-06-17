import { ref } from 'vue'

export const activeSection = ref('dashboard')

export function go(name) {
  activeSection.value = name
}
