<script setup>
defineProps({
  size: { type: [Number, String], default: 32 },
})

const PETALS = Array.from({ length: 8 }, (_, i) => i * 45)
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <g v-for="a in PETALS" :key="'b' + a" :transform="`rotate(${a + 22.5} 32 32)`">
      <ellipse cx="32" cy="13" rx="6" ry="11.5" fill="#F59E0B" />
    </g>
    <g v-for="a in PETALS" :key="'f' + a" :transform="`rotate(${a} 32 32)`">
      <ellipse cx="32" cy="12" rx="6.5" ry="12" fill="#FBBF24" />
    </g>
    <circle cx="32" cy="32" r="12" fill="#78350F" />
    <circle cx="32" cy="32" r="7.5" fill="#92400E" />
  </svg>
</template>
