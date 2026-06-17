<script setup>
const props = defineProps({
  emojis: { type: Array, required: true },
  modelValue: { type: String, required: true },
  // 'habit' uses em-opt style; 'event' uses eemoji style
  variant: { type: String, default: 'event' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div :class="variant === 'habit' ? 'emoji-grid' : 'eemoji-grid'">
    <div
      v-for="e in emojis" :key="e"
      :class="[variant === 'habit' ? 'em-opt' : 'eemoji', { on: modelValue === e }]"
      @click="emit('update:modelValue', e)"
    >{{ e }}</div>
  </div>
</template>

<style scoped>
/* habit variant */
.emoji-grid { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px }
.em-opt { width:36px; height:36px; border-radius:8px; border:2px solid transparent; background:var(--bg); font-size:18px; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center }
.em-opt:hover, .em-opt.on { border-color:var(--sun); background:var(--sun-lt) }

/* event / calendar variant */
.eemoji-grid { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; max-height:86px; overflow-y:auto }
.eemoji { width:32px; height:32px; border-radius:7px; border:2px solid transparent; background:var(--bg); font-size:16px; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center }
.eemoji:hover, .eemoji.on { border-color:var(--sun); background:var(--sun-lt) }
</style>
