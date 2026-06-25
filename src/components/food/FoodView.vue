<script setup>
import { ref } from 'vue'
import { DB, addFoodSpot, updateFoodSpot, deleteFoodSpot, saveSettings } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'
import FoodPickerMap from './FoodPickerMap.vue'

// ── Default tree (fallback when user has no saved tree) ─────────
const DEFAULT_TREE = {
  id: 'root', label: 'Start', icon: '🎲', tag: '',
  children: [
    {
      id: 'nasi', label: 'Nasi', icon: '🍚', tag: 'nasi',
      children: [
        { id: 'nasi-kuah', label: 'Berkuah',      icon: '🥣', tag: 'berkuah', children: [] },
        { id: 'nasi-tdk',  label: 'Tidak berkuah', icon: '🍳', tag: 'tidak',   children: [] },
      ],
    },
    {
      id: 'non-nasi', label: 'Non-nasi', icon: '🥗', tag: 'non-nasi',
      children: [
        { id: 'nn-kuah', label: 'Berkuah',      icon: '🥣', tag: 'berkuah', children: [] },
        { id: 'nn-tdk',  label: 'Tidak berkuah', icon: '🍳', tag: 'tidak',   children: [] },
      ],
    },
  ],
}

function activeTree() { return DB.settings.foodTree || DEFAULT_TREE }

function onTreeUpdate(newTree) {
  saveSettings({ foodTree: newTree })
}

// ── Tabs ────────────────────────────────────────────────────────
const tab = ref('map')

// ── Favorites CRUD ──────────────────────────────────────────────
const showModal = ref(false)
const editId    = ref(null)
const fName     = ref('')
const fNotes    = ref('')
const fCarb     = ref('nasi')
const fTexture  = ref('tidak')

function openAdd() {
  editId.value = null
  fName.value = ''; fNotes.value = ''; fCarb.value = 'nasi'; fTexture.value = 'tidak'
  showModal.value = true
}

function openEdit(spot) {
  editId.value = spot.id
  fName.value = spot.name; fNotes.value = spot.notes
  fCarb.value = spot.carbType; fTexture.value = spot.texture
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function saveSpot() {
  const name = fName.value.trim()
  if (!name) return
  const payload = { name, notes: fNotes.value.trim(), carbType: fCarb.value, texture: fTexture.value }
  if (editId.value) updateFoodSpot(editId.value, payload)
  else addFoodSpot({ id: uid(), ...payload, at: Date.now() })
  closeModal()
}

const CARB_LBL = { nasi: '🍚 Nasi', 'non-nasi': '🥗 Non-nasi' }
const TEX_LBL  = { berkuah: '🥣 Berkuah', tidak: '🍳 Tidak berkuah' }
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>🍜 Food Picks</h1>
      <p>Susah milih makan siang? Ikutin jalurmu sendiri!</p>
    </div>

    <!-- Tabs -->
    <div class="ftabs" style="margin-bottom:20px">
      <button class="ftab" :class="{ active: tab === 'map' }"   @click="tab = 'map'">🗺️ Pilih</button>
      <button class="ftab" :class="{ active: tab === 'spots' }" @click="tab = 'spots'">
        ⭐ Favorit ({{ DB.foodSpots.length }})
      </button>
    </div>

    <!-- ── Map tab ── -->
    <template v-if="tab === 'map'">
      <FoodPickerMap
        :tree="activeTree()"
        :foodSpots="DB.foodSpots"
        @update:tree="onTreeUpdate"
      />
    </template>

    <!-- ── Favorites tab ── -->
    <template v-else>
      <div style="margin-bottom:16px">
        <button class="btn btn-sun" @click="openAdd">＋ Tambah Favorit</button>
      </div>

      <div class="fs-list">
        <template v-if="DB.foodSpots.length">
          <div v-for="spot in DB.foodSpots" :key="spot.id"
               class="fs-card" @click="openEdit(spot)">
            <div class="fs-icon">🍽️</div>
            <div class="fs-body">
              <div class="fs-name">{{ spot.name }}</div>
              <div v-if="spot.notes" class="fs-notes">{{ spot.notes }}</div>
              <div class="fs-tags">
                <span class="fs-tag fs-tc">{{ CARB_LBL[spot.carbType] }}</span>
                <span class="fs-tag fs-tt">{{ TEX_LBL[spot.texture] }}</span>
              </div>
            </div>
            <button class="fs-del" @click.stop="deleteFoodSpot(spot.id)">✕</button>
          </div>
        </template>
        <div v-else class="empty">
          <span class="ee">🍜</span>
          <h3>Belum ada favorit nih</h3>
          <p>Tambahin dulu biar bisa dipilihkan sama node map! 🌻</p>
        </div>
      </div>
    </template>

    <!-- Add / Edit modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">{{ editId ? '✏️ Edit Favorit' : '🍜 Tambah Favorit' }}</div>

        <div class="fg" style="margin-bottom:14px">
          <label>Nama makanan / tempat</label>
          <input type="text" v-model="fName"
                 placeholder="Mis: Nasi Goreng Pak Udin…" @keydown.enter="saveSpot" />
        </div>
        <div class="fg">
          <label>Catatan (opsional)</label>
          <input type="text" v-model="fNotes" placeholder="Mis: Enak banget, deket kantor" />
        </div>

        <div class="fss-label">Karbohidrat</div>
        <div class="fss-row">
          <button class="fss" :class="{ on: fCarb === 'nasi' }"     @click="fCarb = 'nasi'">🍚 Nasi</button>
          <button class="fss" :class="{ on: fCarb === 'non-nasi' }" @click="fCarb = 'non-nasi'">🥗 Non-nasi</button>
        </div>

        <div class="fss-label">Tekstur</div>
        <div class="fss-row">
          <button class="fss" :class="{ on: fTexture === 'berkuah' }" @click="fTexture = 'berkuah'">🥣 Berkuah</button>
          <button class="fss" :class="{ on: fTexture === 'tidak' }"   @click="fTexture = 'tidak'">🍳 Tidak berkuah</button>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn btn-sun"   @click="saveSpot">Simpan ✨</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Favorites list ──────────────────────────────────────────── */
.fs-list { display:flex; flex-direction:column; gap:10px }

.fs-card {
  display:flex; align-items:center; gap:14px;
  background:var(--surface); border-radius:var(--r); padding:14px 16px;
  border:2px solid var(--border); cursor:pointer; transition:all .2s;
  animation:fadeUp .2s ease; position:relative;
}
.fs-card:hover { box-shadow:var(--sh); border-color:var(--sun) }

.fs-icon { font-size:24px; flex-shrink:0 }
.fs-body { flex:1; min-width:0 }
.fs-name  { font-family:'Fredoka One',cursive; font-size:16px; color:var(--text); margin-bottom:4px }
.fs-notes { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

.fs-tags { display:flex; gap:6px; flex-wrap:wrap }
.fs-tag  { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px }
.fs-tc   { background:rgba(251,191,36,.15); color:#B45309 }
.fs-tt   { background:rgba(52,211,153,.15);  color:#059669 }

.fs-del {
  position:absolute; top:9px; right:9px;
  width:26px; height:26px; border:none; background:transparent; border-radius:7px;
  cursor:pointer; color:var(--muted); font-size:11px; opacity:0;
  display:flex; align-items:center; justify-content:center; transition:all .15s;
}
.fs-card:hover .fs-del { opacity:1 }
.fs-del:hover { background:rgba(239,68,68,.12); color:#EF4444 }

/* ── Segment controls in modal ───────────────────────────────── */
.fss-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; margin-top:20px }
.fss-row   { display:flex; gap:8px; margin-bottom:16px }
.fss {
  flex:1; padding:10px 14px; border-radius:var(--r-sm);
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; color:var(--muted);
  transition:all .18s;
}
.fss.on    { border-color:var(--sun); background:rgba(251,191,36,.1); color:var(--sun-dk) }
.fss:hover { border-color:var(--sun); color:var(--sun-dk) }
</style>
