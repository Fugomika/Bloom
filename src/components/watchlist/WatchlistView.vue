<script setup>
import { ref, computed } from 'vue'
import { DB, addWatchItem, updateWatchItem, deleteWatchItem, reorderWatchQueue } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'

const tFilter = ref('all')
const showModal = ref(false)
const editId = ref(null)
const fTitle = ref('')
const fType = ref('movie')
const fStatus = ref('queued')

const watching = computed(() => DB.watchlist.filter(x => x.status === 'watching').sort((a, b) => a.pri - b.pri))
const queued   = computed(() => DB.watchlist.filter(x => x.status === 'queued').sort((a, b) => a.pri - b.pri))
const done     = computed(() => DB.watchlist.filter(x => x.status === 'done').sort((a, b) => b.at - a.at))
const allItems = computed(() => [...watching.value, ...queued.value, ...done.value])

const filtered = computed(() => {
  if (tFilter.value === 'watching') return watching.value
  if (tFilter.value === 'queue')    return queued.value
  if (tFilter.value === 'done')     return done.value
  return allItems.value
})

function openAdd() {
  editId.value = null
  fTitle.value = ''; fType.value = 'movie'; fStatus.value = 'queued'
  showModal.value = true
}

function openEdit(item) {
  editId.value = item.id
  fTitle.value = item.title; fType.value = item.type; fStatus.value = item.status
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function save() {
  const title = fTitle.value.trim()
  if (!title) return
  if (editId.value) {
    updateWatchItem(editId.value, { title, type: fType.value, status: fStatus.value })
  } else {
    addWatchItem({ id: uid(), title, type: fType.value, status: fStatus.value, pri: queued.value.length, at: Date.now() })
  }
  closeModal()
}

const NEXT_STATUS = { queued: 'watching', watching: 'done', done: 'queued' }
const NEXT_ICON   = { queued: '▶️', watching: '✅', done: '🔄' }
const NEXT_TITLE  = { queued: 'Start watching', watching: 'Mark as done', done: 'Add back to queue' }

function cycleStatus(item) {
  updateWatchItem(item.id, { status: NEXT_STATUS[item.status] })
}

function moveUp(item) {
  const list = queued.value
  const idx = list.findIndex(x => x.id === item.id)
  if (idx <= 0) return
  const order = [...list];
  [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]]
  reorderWatchQueue(order.map(x => x.id))
}

function moveDown(item) {
  const list = queued.value
  const idx = list.findIndex(x => x.id === item.id)
  if (idx >= list.length - 1) return
  const order = [...list];
  [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]]
  reorderWatchQueue(order.map(x => x.id))
}

const STATUS_CFG = {
  watching: { label: 'Watching', color: '#F59E0B' },
  queued:   { label: 'Queue',    color: '#60A5FA' },
  done:     { label: 'Done',     color: '#34D399' },
}

const EMPTY_MSG = {
  all:      { ee: '🍿', h: 'Watchlist masih kosong', p: 'Tambahin film atau serial yang mau ditonton yuk!' },
  watching: { ee: '📺', h: 'Belum ada yang lagi ditonton', p: 'Mulai tonton salah satu dari queue kamu ✨' },
  queue:    { ee: '📋', h: 'Queue kosong nih', p: 'Tambahin tontonan baru biar ada daftarnya 🌻' },
  done:     { ee: '🎉', h: 'Belum ada yang selesai', p: 'Nonton dulu, nanti muncul di sini!' },
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>🎬 Watchlist</h1>
      <p>Lacak tontonan kamu — yang lagi jalan, antrian, dan yang sudah tamat</p>
    </div>

    <div style="margin-bottom:18px">
      <button class="btn btn-sun" @click="openAdd">＋ Tambah</button>
    </div>

    <div class="ftabs" style="margin-bottom:18px">
      <button class="ftab" :class="{ active: tFilter === 'all' }" @click="tFilter = 'all'">Semua ({{ allItems.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'watching' }" @click="tFilter = 'watching'">🍿 Nonton ({{ watching.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'queue' }" @click="tFilter = 'queue'">📋 Queue ({{ queued.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'done' }" @click="tFilter = 'done'">✅ Selesai ({{ done.length }})</button>
    </div>

    <div class="wl-list">
      <template v-if="filtered.length">
        <div v-for="item in filtered" :key="item.id" class="wl-card" :class="`wl-${item.status}`">
          <div class="wl-type-icon">{{ item.type === 'movie' ? '🎬' : '📺' }}</div>

          <div class="wl-body" @click="openEdit(item)">
            <div class="wl-title">{{ item.title }}</div>
            <div class="wl-meta">
              <span class="wl-badge-type">{{ item.type === 'movie' ? 'Movie' : 'Series' }}</span>
              <span class="wl-badge-status" :style="`color:${STATUS_CFG[item.status].color}`">
                ● {{ STATUS_CFG[item.status].label }}
              </span>
            </div>
          </div>

          <div v-if="item.status === 'queued'" class="wl-arrows">
            <button class="wl-arr" @click.stop="moveUp(item)" title="Naikkkan prioritas">▲</button>
            <button class="wl-arr" @click.stop="moveDown(item)" title="Turunkan prioritas">▼</button>
          </div>

          <button class="wl-action" @click.stop="cycleStatus(item)" :title="NEXT_TITLE[item.status]">
            {{ NEXT_ICON[item.status] }}
          </button>
          <button class="wl-del" @click.stop="deleteWatchItem(item.id)">✕</button>
        </div>
      </template>

      <div v-else class="empty">
        <span class="ee">{{ EMPTY_MSG[tFilter].ee }}</span>
        <h3>{{ EMPTY_MSG[tFilter].h }}</h3>
        <p>{{ EMPTY_MSG[tFilter].p }}</p>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">{{ editId ? '✏️ Edit Tontonan' : '🎬 Tambah ke Watchlist' }}</div>

        <div class="fg">
          <label>Judul</label>
          <input type="text" v-model="fTitle" placeholder="Nama film atau serial…" @keydown.enter="save" />
        </div>

        <div class="wl-seg-row">
          <button class="wl-seg" :class="{ on: fType === 'movie' }" @click="fType = 'movie'">🎬 Movie</button>
          <button class="wl-seg" :class="{ on: fType === 'series' }" @click="fType = 'series'">📺 Series</button>
        </div>

        <div class="wl-seg-row">
          <button class="wl-seg" :class="{ on: fStatus === 'queued' }" @click="fStatus = 'queued'">📋 Queue</button>
          <button class="wl-seg" :class="{ on: fStatus === 'watching' }" @click="fStatus = 'watching'">🍿 Nonton</button>
          <button class="wl-seg" :class="{ on: fStatus === 'done' }" @click="fStatus = 'done'">✅ Selesai</button>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn btn-sun" @click="save">Simpan ✨</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wl-list { display: flex; flex-direction: column; gap: 10px }

.wl-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border-radius: var(--r);
  padding: 14px 16px;
  border: 2px solid var(--border);
  transition: all .2s;
  animation: fadeUp .2s ease;
  position: relative;
}
.wl-card:hover { box-shadow: var(--sh); border-color: var(--sun) }
.wl-watching { border-left: 4px solid #F59E0B }
.wl-done { opacity: .65 }
.wl-done:hover { opacity: 1 }

.wl-type-icon {
  font-size: 22px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wl-body { flex: 1; cursor: pointer; min-width: 0 }
.wl-title {
  font-family: 'Fredoka One', cursive;
  font-size: 16px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.wl-meta { display: flex; align-items: center; gap: 8px }
.wl-badge-type {
  font-size: 10px;
  font-weight: 800;
  background: var(--bg);
  color: var(--muted);
  padding: 2px 7px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
}
.wl-badge-status { font-size: 11px; font-weight: 800 }

.wl-arrows { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0 }
.wl-arr {
  width: 24px; height: 24px;
  border: none; background: var(--bg); border-radius: 6px;
  cursor: pointer; font-size: 10px; color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.wl-arr:hover { background: var(--sun); color: #fff }

.wl-action {
  width: 34px; height: 34px;
  border: none; background: var(--bg); border-radius: 9px;
  cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .15s;
}
.wl-action:hover { background: var(--sun); transform: scale(1.1) }

.wl-del {
  width: 28px; height: 28px;
  border: none; background: transparent; border-radius: 7px;
  cursor: pointer; color: var(--muted); font-size: 11px;
  opacity: 0; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.wl-card:hover .wl-del { opacity: 1 }
.wl-del:hover { background: rgba(239,68,68,.12); color: #EF4444 }

.wl-seg-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.wl-seg {
  flex: 1;
  padding: 9px 14px;
  border-radius: var(--r-sm);
  border: 2px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
  transition: all .18s;
}
.wl-seg.on {
  border-color: var(--sun);
  background: rgba(251,191,36,.1);
  color: var(--sun-dk);
}
.wl-seg:hover { border-color: var(--sun); color: var(--sun-dk) }
</style>
