<script setup>
import AppIcon from '../ui/AppIcon.vue'

defineProps({
  open: Boolean,
  sections: { type: Array, default: () => [] },
  meta: { type: Object, required: true },
  active: String,
})
const emit = defineEmits(['navigate', 'close'])
</script>

<template>
  <div class="overlay mdrawer-overlay" :class="{ open }" @click.self="emit('close')">
    <aside class="mdrawer">
      <div class="mdrawer-head">
        <span class="mdrawer-title">Menu</span>
        <button class="mdrawer-close" @click="emit('close')">
          <AppIcon name="x" :size="18" />
        </button>
      </div>
      <button
        v-for="s in sections" :key="s"
        class="mdrawer-item" :class="{ active: active === s }"
        @click="emit('navigate', s)"
      >
        <span class="mdi-icon"><AppIcon :name="meta[s].icon" :size="18" /></span>
        <span class="mdi-label">{{ meta[s].label }}</span>
      </button>
    </aside>
  </div>
</template>

<style scoped>
.mdrawer-overlay { justify-content: flex-end; align-items: stretch }

.mdrawer {
  width: 250px;
  max-width: 78vw;
  height: 100%;
  background: var(--sidebar);
  padding: 18px 12px;
  padding-bottom: calc(18px + env(safe-area-inset-bottom, 0));
  display: flex;
  flex-direction: column;
  gap: 2px;
  transform: translateX(100%);
  transition: transform .25s ease;
  box-shadow: -12px 0 40px rgba(0,0,0,.25);
}
.mdrawer-overlay.open .mdrawer { transform: translateX(0) }

.mdrawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px 14px;
}
.mdrawer-title {
  font-family: 'Fredoka One', cursive;
  font-size: 18px;
  color: #fff;
}
.mdrawer-close {
  border: none;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.7);
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.mdrawer-close:hover { background: rgba(255,255,255,.16); color: #fff }

.mdrawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 10px;
  border: none;
  background: none;
  border-radius: var(--r-sm);
  color: rgba(255,255,255,.6);
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  transition: all .18s;
}
.mdrawer-item:hover { background: var(--sidebar-hover); color: rgba(255,255,255,.85) }
.mdrawer-item.active { background: var(--sidebar-active); color: #fff }
.mdi-icon { display: flex; flex-shrink: 0 }
</style>
