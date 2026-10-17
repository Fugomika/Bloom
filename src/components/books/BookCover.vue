<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  book: { type: Object, required: true },
})

const failed = ref(false)
watch(() => props.book.cover_url, () => { failed.value = false })

// Placeholder spine colour derived from the title so it stays stable
const SPINES = ['#7C3AED', '#2563EB', '#0D9488', '#D97706', '#DB2777', '#4B5563', '#B45309', '#15803D']
const spine = computed(() => {
  let h = 0
  for (const ch of props.book.title || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SPINES[h % SPINES.length]
})
</script>

<template>
  <div class="bc">
    <img v-if="book.cover_url && !failed" :src="book.cover_url" :alt="book.title" loading="lazy"
         referrerpolicy="no-referrer" @error="failed = true" />
    <div v-else class="bc-ph" :style="`background:linear-gradient(160deg, ${spine}, ${spine}cc)`">
      <span class="bc-title">{{ book.title || 'Tanpa judul' }}</span>
      <span v-if="book.author" class="bc-author">{{ book.author }}</span>
    </div>
  </div>
</template>

<style scoped>
.bc { width:100%; height:100%; overflow:hidden; background:#EEE; container-type:inline-size }
.bc img { width:100%; height:100%; object-fit:cover; display:block }
.bc-ph {
  width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; gap:6%;
  padding:10% 9% 10% 14%; color:#fff; box-shadow:inset 6px 0 0 rgba(0,0,0,.18);
}
.bc-title {
  font-family:'Fredoka One',cursive; font-size:max(9px, 12cqi); line-height:1.15;
  display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;
}
.bc-author { font-size:max(8px, 8.5cqi); font-weight:800; opacity:.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
</style>
