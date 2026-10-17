<script setup>
import { computed } from 'vue'
import { imageUrls } from '../../composables/useStore.js'
import { WARDROBE_CATEGORIES } from '../../utils/constants.js'

const props = defineProps({
  item: { type: Object, default: null },
  src:  { type: String, default: '' },   // explicit URL (e.g. local preview) wins over item.image_path
})

const cat = computed(() =>
  WARDROBE_CATEGORIES.find(c => c.key === props.item?.category) || WARDROBE_CATEGORIES[WARDROBE_CATEGORIES.length - 1])
const url = computed(() => props.src || imageUrls[props.item?.image_path]?.url || '')
</script>

<template>
  <div class="thumb" :style="url ? '' : `background:${cat.color}18`">
    <img v-if="url" :src="url" :alt="item?.name || ''" loading="lazy" draggable="false" />
    <span v-else class="thumb-ee">{{ cat.icon }}</span>
  </div>
</template>

<style scoped>
.thumb {
  width:100%; height:100%; display:flex; align-items:center; justify-content:center;
  background:linear-gradient(160deg,#FFFDF5,#F5F0E4); overflow:hidden; container-type:inline-size;
}
.thumb img { width:100%; height:100%; object-fit:contain; padding:6%; user-select:none }
.thumb-ee { font-size:min(48px, 42cqi); line-height:1 }
</style>
