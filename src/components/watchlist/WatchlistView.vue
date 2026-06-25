<script setup>
import { ref, computed } from 'vue'
import { DB, addWatchItem, updateWatchItem, deleteWatchItem, reorderWatchQueue } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'

const PRIORITY_CFG = {
  must:  { icon: '🔥', label: 'Wajib nonton', color: '#EF4444', bg: 'rgba(239,68,68,.12)' },
  want:  { icon: '💛', label: 'Pengen nonton', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' },
  chill: { icon: '🌙', label: 'Santai aja',    color: '#94A3B8', bg: 'rgba(148,163,184,.12)' },
}
const PRIORITY_ORDER  = { must: 0, want: 1, chill: 2 }
const PRIORITY_WEIGHT = { must: 5, want: 2, chill: 1 }

const tFilter   = ref('all')
const showModal = ref(false)
const editId    = ref(null)
const fTitle    = ref('')
const fType     = ref('movie')
const fStatus   = ref('queued')
const fPriority = ref('want')

const watching = computed(() => DB.watchlist.filter(x => x.status === 'watching').sort((a, b) => a.pri - b.pri))
const queued   = computed(() =>
  DB.watchlist
    .filter(x => x.status === 'queued')
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || 'want'] ?? 1
      const pb = PRIORITY_ORDER[b.priority || 'want'] ?? 1
      return pa !== pb ? pa - pb : a.pri - b.pri
    })
)
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
  fTitle.value = ''; fType.value = 'movie'; fStatus.value = 'queued'; fPriority.value = 'want'
  showModal.value = true
}

function openEdit(item) {
  editId.value    = item.id
  fTitle.value    = item.title
  fType.value     = item.type
  fStatus.value   = item.status
  fPriority.value = item.priority || 'want'
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function save() {
  const title = fTitle.value.trim()
  if (!title) return
  if (editId.value) {
    updateWatchItem(editId.value, { title, type: fType.value, status: fStatus.value, priority: fPriority.value })
  } else {
    addWatchItem({ id: uid(), title, type: fType.value, status: fStatus.value, priority: fPriority.value, pri: queued.value.length, at: Date.now() })
  }
  closeModal()
}

const NEXT_STATUS = { queued: 'watching', watching: 'done', done: 'queued' }
const NEXT_ICON   = { queued: '▶️', watching: '✅', done: '🔄' }
const NEXT_TITLE  = { queued: 'Mulai nonton', watching: 'Tandai selesai', done: 'Masukin queue lagi' }

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
  all:      { ee: '🍿', h: 'Watchlist masih kosong',    p: 'Tambahin film atau serial yang mau ditonton yuk!' },
  watching: { ee: '📺', h: 'Belum ada yang lagi ditonton', p: 'Mulai tonton salah satu dari queue kamu ✨' },
  queue:    { ee: '📋', h: 'Queue kosong nih',           p: 'Tambahin tontonan baru biar ada daftarnya 🌻' },
  done:     { ee: '🎉', h: 'Belum ada yang selesai',     p: 'Nonton dulu, nanti muncul di sini!' },
}

// ── Picker ───────────────────────────────────────────────────────
const showPicker    = ref(false)
const pickerMood    = ref('all')
const pickerSeed    = ref(0)
const pickerRolling = ref(false)

const pickerPool = computed(() => {
  if (pickerMood.value === 'movie')  return queued.value.filter(x => x.type === 'movie')
  if (pickerMood.value === 'series') return queued.value.filter(x => x.type === 'series')
  return queued.value
})

const pickerResult = computed(() => {
  void pickerSeed.value
  if (!pickerPool.value.length) return null
  // Weighted random: 🔥 5x, 💛 2x, 🌙 1x
  const weighted = pickerPool.value.flatMap(x =>
    Array(PRIORITY_WEIGHT[x.priority || 'want']).fill(x)
  )
  return weighted[Math.floor(Math.random() * weighted.length)]
})

function openPicker() {
  pickerMood.value = 'all'; pickerSeed.value++; showPicker.value = true
}

function rerollPicker() {
  pickerRolling.value = true
  setTimeout(() => { pickerSeed.value++; pickerRolling.value = false }, 220)
}

function setMood(mood) {
  if (pickerMood.value === mood) return
  pickerMood.value = mood
  rerollPicker()
}

function startWatching() {
  if (!pickerResult.value) return
  updateWatchItem(pickerResult.value.id, { status: 'watching' })
  showPicker.value = false
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>🎬 Watchlist</h1>
      <p>Lacak tontonan kamu — yang lagi jalan, antrian, dan yang sudah tamat</p>
    </div>

    <div class="wl-top-row">
      <button class="btn btn-sun" @click="openAdd">＋ Tambah</button>
      <button class="wl-pick-btn" @click="openPicker" :disabled="!queued.length">
        🎲 Pilih Sekarang!
      </button>
    </div>

    <!-- Overwhelmed banner (appears when queue ≥ 3) -->
    <div v-if="queued.length >= 3 && tFilter !== 'done' && tFilter !== 'watching'" class="wl-banner">
      <span class="wl-banner-ee">😵‍💫</span>
      <div class="wl-banner-text">
        <span class="wl-banner-title">Bingung mau nonton yang mana?</span>
        <span class="wl-banner-sub">{{ queued.length }} tontonan nunggu giliran — biar kita yang pilihkan!</span>
      </div>
      <button class="wl-banner-btn" @click="openPicker">🎲 Pilih!</button>
    </div>

    <div class="ftabs" style="margin-bottom:18px">
      <button class="ftab" :class="{ active: tFilter === 'all' }"      @click="tFilter = 'all'">Semua ({{ allItems.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'watching' }" @click="tFilter = 'watching'">🍿 Nonton ({{ watching.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'queue' }"    @click="tFilter = 'queue'">📋 Queue ({{ queued.length }})</button>
      <button class="ftab" :class="{ active: tFilter === 'done' }"     @click="tFilter = 'done'">✅ Selesai ({{ done.length }})</button>
    </div>

    <div class="wl-list">
      <template v-if="filtered.length">
        <div v-for="item in filtered" :key="item.id"
             class="wl-card" :class="`wl-${item.status}`">
          <div class="wl-type-icon">{{ item.type === 'movie' ? '🎬' : '📺' }}</div>

          <div class="wl-body" @click="openEdit(item)">
            <div class="wl-title">{{ item.title }}</div>
            <div class="wl-meta">
              <span class="wl-badge-type">{{ item.type === 'movie' ? 'Movie' : 'Series' }}</span>
              <span class="wl-badge-status" :style="`color:${STATUS_CFG[item.status].color}`">
                ● {{ STATUS_CFG[item.status].label }}
              </span>
              <!-- Priority badge (shown on queued + watching) -->
              <span v-if="item.status !== 'done'" class="wl-badge-pri"
                    :style="`color:${PRIORITY_CFG[item.priority || 'want'].color}; background:${PRIORITY_CFG[item.priority || 'want'].bg}`">
                {{ PRIORITY_CFG[item.priority || 'want'].icon }} {{ PRIORITY_CFG[item.priority || 'want'].label }}
              </span>
            </div>
          </div>

          <div v-if="item.status === 'queued'" class="wl-arrows">
            <button class="wl-arr" @click.stop="moveUp(item)"   title="Naikkan urutan">▲</button>
            <button class="wl-arr" @click.stop="moveDown(item)" title="Turunkan urutan">▼</button>
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
          <button class="wl-seg" :class="{ on: fType === 'movie' }"  @click="fType = 'movie'">🎬 Movie</button>
          <button class="wl-seg" :class="{ on: fType === 'series' }" @click="fType = 'series'">📺 Series</button>
        </div>

        <div class="wl-seg-row">
          <button class="wl-seg" :class="{ on: fStatus === 'queued' }"   @click="fStatus = 'queued'">📋 Queue</button>
          <button class="wl-seg" :class="{ on: fStatus === 'watching' }" @click="fStatus = 'watching'">🍿 Nonton</button>
          <button class="wl-seg" :class="{ on: fStatus === 'done' }"     @click="fStatus = 'done'">✅ Selesai</button>
        </div>

        <!-- Priority picker -->
        <div class="wl-seg-label">Prioritas</div>
        <div class="wl-seg-row">
          <button class="wl-seg wl-seg-must"  :class="{ on: fPriority === 'must' }"  @click="fPriority = 'must'">🔥 Wajib</button>
          <button class="wl-seg wl-seg-want"  :class="{ on: fPriority === 'want' }"  @click="fPriority = 'want'">💛 Pengen</button>
          <button class="wl-seg wl-seg-chill" :class="{ on: fPriority === 'chill' }" @click="fPriority = 'chill'">🌙 Santai</button>
        </div>
        <div class="wl-pri-hint">
          <template v-if="fPriority === 'must'">🔥 Wajib — diprioritaskan di queue dan lebih sering dipilih oleh picker</template>
          <template v-else-if="fPriority === 'chill'">🌙 Santai — jarang muncul di picker, buat tontonan cadangan</template>
          <template v-else>💛 Pengen — standar, muncul normal di queue dan picker</template>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn btn-sun"   @click="save">Simpan ✨</button>
        </div>
      </div>
    </div>

    <!-- Picker Modal -->
    <div class="overlay" :class="{ open: showPicker }" @click.self="showPicker = false">
      <div class="modal wlp-modal">
        <div class="wlp-head">
          <span class="wlp-ee">🎲</span>
          <div>
            <div class="wlp-title">Nonton Apa Nih?</div>
            <div class="wlp-sub">{{ queued.length }} tontonan di queue — ini pilihannya!</div>
          </div>
        </div>

        <!-- Mood filter -->
        <div class="wlp-mood-row">
          <button class="wlp-mood" :class="{ on: pickerMood === 'all' }"    @click="setMood('all')">🎲 Semua</button>
          <button class="wlp-mood" :class="{ on: pickerMood === 'movie' }"  @click="setMood('movie')">🎬 Movie</button>
          <button class="wlp-mood" :class="{ on: pickerMood === 'series' }" @click="setMood('series')">📺 Series</button>
        </div>

        <!-- Result card -->
        <Transition name="wlp-pop" mode="out-in">
          <div v-if="pickerResult" :key="pickerResult.id + '-' + pickerSeed"
               class="wlp-result" :class="{ 'wlp-rolling': pickerRolling }">
            <div class="wlp-result-type">{{ pickerResult.type === 'movie' ? '🎬' : '📺' }}</div>
            <div class="wlp-result-name">{{ pickerResult.title }}</div>
            <div class="wlp-result-meta">
              {{ pickerResult.type === 'movie' ? 'Movie' : 'Series' }}
              · #{{ queued.findIndex(x => x.id === pickerResult.id) + 1 }} di queue
            </div>
            <div class="wlp-result-pri"
                 :style="`color:${PRIORITY_CFG[pickerResult.priority || 'want'].color}; background:${PRIORITY_CFG[pickerResult.priority || 'want'].bg}`">
              {{ PRIORITY_CFG[pickerResult.priority || 'want'].icon }}
              {{ PRIORITY_CFG[pickerResult.priority || 'want'].label }}
            </div>
          </div>
          <div v-else key="empty" class="wlp-result wlp-result-empty">
            <div class="wlp-result-type">😅</div>
            <div class="wlp-result-name" style="font-size:16px">Tidak ada di kategori ini</div>
            <div class="wlp-result-meta">Coba pilih "Semua" atau tambahin tontonan baru!</div>
          </div>
        </Transition>

        <p class="wlp-note">Tontonan 🔥 Wajib lebih sering muncul di sini</p>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="rerollPicker" :disabled="!pickerPool.length">🎲 Lain lagi</button>
          <button v-if="pickerResult" class="btn btn-sun" @click="startWatching">▶️ Nonton sekarang!</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Top row ─────────────────────────────────────────────────── */
.wl-top-row { display:flex; gap:10px; align-items:center; margin-bottom:18px }

.wl-pick-btn {
  padding:9px 18px; border-radius:var(--r-sm);
  border:2px solid var(--sun); background:rgba(251,191,36,.1);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:13px; font-weight:900;
  color:var(--sun-dk); transition:all .18s;
}
.wl-pick-btn:hover:not(:disabled) { background:rgba(251,191,36,.2); box-shadow:0 0 0 3px rgba(251,191,36,.18) }
.wl-pick-btn:disabled { opacity:.35; cursor:default }

/* ── Overwhelmed banner ──────────────────────────────────────── */
.wl-banner {
  display:flex; align-items:center; gap:12px;
  background:linear-gradient(135deg, rgba(251,191,36,.1) 0%, rgba(249,115,22,.07) 100%);
  border:1.5px solid rgba(251,191,36,.3); border-radius:var(--r);
  padding:14px 16px; margin-bottom:16px; animation:fadeUp .25s ease;
}
.wl-banner-ee   { font-size:26px; flex-shrink:0 }
.wl-banner-text { flex:1; min-width:0 }
.wl-banner-title { display:block; font-family:'Fredoka One',cursive; font-size:14px; color:var(--text) }
.wl-banner-sub   { display:block; font-size:11px; font-weight:700; color:var(--muted); margin-top:2px }
.wl-banner-btn {
  flex-shrink:0; padding:7px 14px; border-radius:var(--r-sm); white-space:nowrap;
  border:2px solid var(--sun); background:var(--sun);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:12px; font-weight:900;
  color:#78350F; transition:all .18s;
}
.wl-banner-btn:hover { background:#FCD34D }

/* ── List ────────────────────────────────────────────────────── */
.wl-list { display:flex; flex-direction:column; gap:10px }

.wl-card {
  display:flex; align-items:center; gap:12px;
  background:var(--surface); border-radius:var(--r); padding:14px 16px;
  border:2px solid var(--border); transition:all .2s;
  animation:fadeUp .2s ease; position:relative;
}
.wl-card:hover { box-shadow:var(--sh); border-color:var(--sun) }
.wl-watching   { border-left:4px solid #F59E0B }
.wl-done       { opacity:.65 }
.wl-done:hover { opacity:1 }

.wl-type-icon {
  font-size:22px; width:40px; height:40px; border-radius:10px;
  background:var(--bg); display:flex; align-items:center; justify-content:center; flex-shrink:0;
}

.wl-body  { flex:1; cursor:pointer; min-width:0 }
.wl-title {
  font-family:'Fredoka One',cursive; font-size:16px; color:var(--text);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;
}
.wl-meta         { display:flex; align-items:center; gap:6px; flex-wrap:wrap }
.wl-badge-type   { font-size:10px; font-weight:800; background:var(--bg); color:var(--muted); padding:2px 7px; border-radius:20px; border:1.5px solid var(--border) }
.wl-badge-status { font-size:11px; font-weight:800 }
.wl-badge-pri    { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px }

.wl-arrows { display:flex; flex-direction:column; gap:2px; flex-shrink:0 }
.wl-arr {
  width:24px; height:24px; border:none; background:var(--bg); border-radius:6px;
  cursor:pointer; font-size:10px; color:var(--muted);
  display:flex; align-items:center; justify-content:center; transition:all .15s;
}
.wl-arr:hover { background:var(--sun); color:#fff }

.wl-action {
  width:34px; height:34px; border:none; background:var(--bg); border-radius:9px;
  cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:all .15s;
}
.wl-action:hover { background:var(--sun); transform:scale(1.1) }

.wl-del {
  width:28px; height:28px; border:none; background:transparent; border-radius:7px;
  cursor:pointer; color:var(--muted); font-size:11px; opacity:0; transition:all .15s;
  display:flex; align-items:center; justify-content:center;
}
.wl-card:hover .wl-del { opacity:1 }
.wl-del:hover { background:rgba(239,68,68,.12); color:#EF4444 }

/* ── Modal segments ──────────────────────────────────────────── */
.wl-seg-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; margin-top:4px }
.wl-seg-row  { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap }
.wl-seg {
  flex:1; padding:9px 14px; border-radius:var(--r-sm);
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; color:var(--muted);
  transition:all .18s;
}
.wl-seg.on    { border-color:var(--sun); background:rgba(251,191,36,.1); color:var(--sun-dk) }
.wl-seg:hover { border-color:var(--sun); color:var(--sun-dk) }

/* Priority segment overrides when active */
.wl-seg-must.on  { border-color:#EF4444; background:rgba(239,68,68,.08); color:#EF4444 }
.wl-seg-must:hover { border-color:#EF4444; color:#EF4444 }
.wl-seg-chill.on  { border-color:#94A3B8; background:rgba(148,163,184,.08); color:#64748B }
.wl-seg-chill:hover { border-color:#94A3B8; color:#64748B }

.wl-pri-hint { font-size:11px; font-weight:700; color:var(--muted); margin-bottom:16px; min-height:16px }

/* ── Picker modal ────────────────────────────────────────────── */
.wlp-modal { text-align:center }

.wlp-head  { display:flex; align-items:center; gap:12px; text-align:left; margin-bottom:20px }
.wlp-ee    { font-size:36px; flex-shrink:0 }
.wlp-title { font-family:'Fredoka One',cursive; font-size:20px; color:var(--text); line-height:1.2 }
.wlp-sub   { font-size:12px; font-weight:700; color:var(--muted); margin-top:2px }

.wlp-mood-row { display:flex; gap:8px; justify-content:center; margin-bottom:16px }
.wlp-mood {
  padding:7px 16px; border-radius:20px;
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted);
  transition:all .18s;
}
.wlp-mood.on    { border-color:var(--sun); background:rgba(251,191,36,.12); color:var(--sun-dk) }
.wlp-mood:hover { border-color:var(--sun); color:var(--sun-dk) }

.wlp-result {
  background:linear-gradient(135deg, rgba(251,191,36,.09) 0%, rgba(249,115,22,.06) 100%);
  border:2px solid rgba(251,191,36,.28); border-radius:var(--r);
  padding:24px 20px; margin-bottom:4px; min-height:150px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:6px; transition:opacity .18s;
}
.wlp-rolling       { opacity:.15 }
.wlp-result-empty  { border-color:var(--border); background:var(--surface) }

.wlp-result-type { font-size:34px }
.wlp-result-name {
  font-family:'Fredoka One',cursive; font-size:22px; color:var(--sun-dk); line-height:1.2;
}
.wlp-result-meta { font-size:12px; font-weight:700; color:var(--muted) }
.wlp-result-pri  { font-size:11px; font-weight:800; padding:3px 12px; border-radius:20px; margin-top:2px }

.wlp-note { font-size:11px; font-weight:700; color:var(--muted); margin:8px 0 4px; text-align:center }

/* Result card transition */
.wlp-pop-enter-active { transition:all .22s ease }
.wlp-pop-leave-active { transition:all .15s ease }
.wlp-pop-enter-from   { opacity:0; transform:scale(.94) translateY(8px) }
.wlp-pop-leave-to     { opacity:0; transform:scale(1.03) }

@media (max-width: 480px) {
  .wl-banner { padding:12px }
  .wl-banner-title { font-size:13px }
  .wlp-result-name { font-size:18px }
  .wlp-mood-row { gap:6px }
  .wlp-mood { padding:6px 10px; font-size:11px }
  .wl-badge-pri { display:none }
}
</style>
