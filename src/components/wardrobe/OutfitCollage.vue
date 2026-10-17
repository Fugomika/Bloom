<script setup>
import { computed } from 'vue'
import { DB } from '../../composables/useStore.js'
import ItemThumb from './ItemThumb.vue'

const props = defineProps({ itemIds: { type: Array, default: () => [] } })

const items = computed(() => props.itemIds.map(id => DB.wardrobe.find(i => i.id === id)).filter(Boolean))
const shown = computed(() => items.value.slice(0, 4))
const extra = computed(() => items.value.length - shown.value.length)
</script>

<template>
  <div class="oc" :class="`oc-${Math.max(shown.length, 1)}`">
    <div v-for="it in shown" :key="it.id" class="oc-cell"><ItemThumb :item="it" /></div>
    <div v-if="!shown.length" class="oc-cell oc-empty">👗</div>
    <span v-if="extra > 0" class="oc-more">+{{ extra }}</span>
  </div>
</template>

<style scoped>
.oc { position:relative; display:grid; gap:2px; width:100%; height:100%; background:var(--border) }
.oc-1 { grid-template-columns:1fr }
.oc-2 { grid-template-columns:1fr 1fr }
.oc-3 { grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr }
.oc-3 .oc-cell:first-child { grid-row:span 2 }
.oc-4 { grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr }
.oc-cell { min-width:0; min-height:0; overflow:hidden }
.oc-empty { display:flex; align-items:center; justify-content:center; font-size:34px; background:#FAFAF5 }
.oc-more {
  position:absolute; right:6px; bottom:6px; padding:2px 8px; border-radius:20px;
  background:rgba(26,14,0,.7); color:#fff; font-size:11px; font-weight:900;
}
</style>
