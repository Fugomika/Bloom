<script setup>
import { ref, computed } from 'vue'
import { DB, addFoodSpot, updateFoodSpot, deleteFoodSpot } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'

// ── Favorites CRUD ─────────────────────────────────────────────
const showModal = ref(false)
const editId = ref(null)
const fName = ref('')
const fNotes = ref('')
const fCarb = ref('nasi')
const fTexture = ref('tidak')

function openAdd() {
  editId.value = null
  fName.value = ''; fNotes.value = ''; fCarb.value = 'nasi'; fTexture.value = 'tidak'
  showModal.value = true
}

function openEdit(spot) {
  editId.value = spot.id
  fName.value = spot.name; fNotes.value = spot.notes; fCarb.value = spot.carbType; fTexture.value = spot.texture
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function saveSpot() {
  const name = fName.value.trim()
  if (!name) return
  if (editId.value) {
    updateFoodSpot(editId.value, { name, notes: fNotes.value.trim(), carbType: fCarb.value, texture: fTexture.value })
  } else {
    addFoodSpot({ id: uid(), name, notes: fNotes.value.trim(), carbType: fCarb.value, texture: fTexture.value, at: Date.now() })
  }
  closeModal()
}

// ── Picker ─────────────────────────────────────────────────────
const showPicker = ref(false)
const pickerStep = ref(1)
const pickerCarb = ref(null)
const pickerTexture = ref(null)
const pickerResult = ref(null)
const spinning = ref(false)

function openPicker() {
  pickerStep.value = 1; pickerCarb.value = null; pickerTexture.value = null
  pickerResult.value = null; spinning.value = false
  showPicker.value = true
}

function closePicker() { showPicker.value = false }

function pickCarb(c) {
  pickerCarb.value = c
  pickerStep.value = 2
}

function pickTexture(t) {
  pickerTexture.value = t
  pickerStep.value = 3
  spinning.value = true
  const matches = DB.foodSpots.filter(s => s.carbType === pickerCarb.value && s.texture === t)
  setTimeout(() => {
    spinning.value = false
    pickerResult.value = matches.length > 0
      ? matches[Math.floor(Math.random() * matches.length)]
      : null
  }, 900)
}

function resetPicker() {
  pickerStep.value = 1; pickerCarb.value = null; pickerTexture.value = null
  pickerResult.value = null; spinning.value = false
}

const CARB_LABEL  = { 'nasi': '🍚 Nasi', 'non-nasi': '🥗 Non-nasi' }
const TEX_LABEL   = { 'berkuah': '🥣 Berkuah', 'tidak': '🍳 Tidak berkuah' }
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>🍜 Food Picks</h1>
      <p>Susah milih makan siang? Biar Bloom yang bantu!</p>
    </div>

    <!-- Pick for me CTA -->
    <div class="pk-cta-wrap">
      <button class="pk-cta-btn" @click="openPicker">
        <span class="pk-cta-icon">🎲</span>
        <div>
          <div class="pk-cta-title">Mau makan apa hari ini?</div>
          <div class="pk-cta-sub">Pilihkan aku dari favorit!</div>
        </div>
      </button>
    </div>

    <!-- Favorites -->
    <div class="fs-head-row">
      <h2 class="fs-section-title">⭐ Favorit</h2>
      <button class="btn btn-sun" style="font-size:13px;padding:8px 16px" @click="openAdd">＋ Tambah</button>
    </div>

    <div class="fs-list">
      <template v-if="DB.foodSpots.length">
        <div v-for="spot in DB.foodSpots" :key="spot.id" class="fs-card" @click="openEdit(spot)">
          <div class="fs-card-icon">🍽️</div>
          <div class="fs-card-body">
            <div class="fs-card-name">{{ spot.name }}</div>
            <div v-if="spot.notes" class="fs-card-notes">{{ spot.notes }}</div>
            <div class="fs-tags">
              <span class="fs-tag fs-tag-carb">{{ CARB_LABEL[spot.carbType] }}</span>
              <span class="fs-tag fs-tag-tex">{{ TEX_LABEL[spot.texture] }}</span>
            </div>
          </div>
          <button class="fs-del" @click.stop="deleteFoodSpot(spot.id)">✕</button>
        </div>
      </template>
      <div v-else class="empty">
        <span class="ee">🍜</span>
        <h3>Belum ada favorit nih</h3>
        <p>Tambahin makanan favorit biar bisa dipilihkan! 🌻</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">{{ editId ? '✏️ Edit Favorit' : '🍜 Tambah Favorit' }}</div>

        <div class="fg">
          <label>Nama makanan / tempat</label>
          <input type="text" v-model="fName" placeholder="Mis: Nasi Goreng Pak Udin…" @keydown.enter="saveSpot" />
        </div>
        <div class="fg">
          <label>Catatan (opsional)</label>
          <input type="text" v-model="fNotes" placeholder="Mis: Enak banget, di deket kantor" />
        </div>

        <div class="fs-seg-label">Karbohidrat</div>
        <div class="fs-seg-row">
          <button class="fs-seg" :class="{ on: fCarb === 'nasi' }" @click="fCarb = 'nasi'">🍚 Nasi</button>
          <button class="fs-seg" :class="{ on: fCarb === 'non-nasi' }" @click="fCarb = 'non-nasi'">🥗 Non-nasi</button>
        </div>

        <div class="fs-seg-label">Tekstur</div>
        <div class="fs-seg-row">
          <button class="fs-seg" :class="{ on: fTexture === 'berkuah' }" @click="fTexture = 'berkuah'">🥣 Berkuah</button>
          <button class="fs-seg" :class="{ on: fTexture === 'tidak' }" @click="fTexture = 'tidak'">🍳 Tidak berkuah</button>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn btn-sun" @click="saveSpot">Simpan ✨</button>
        </div>
      </div>
    </div>

    <!-- Picker Modal -->
    <div class="overlay" :class="{ open: showPicker }" @click.self="closePicker">
      <div class="modal pk-modal">
        <!-- Step 1: Carb -->
        <template v-if="pickerStep === 1">
          <div class="pk-head">🍽️ Mau makan apa?</div>
          <p class="pk-sub">Dulu, karbohidratnya gimana?</p>
          <div class="pk-choices">
            <button class="pk-choice" @click="pickCarb('nasi')">
              <span class="pk-choice-icon">🍚</span>
              <span class="pk-choice-label">Nasi</span>
            </button>
            <button class="pk-choice" @click="pickCarb('non-nasi')">
              <span class="pk-choice-icon">🥗</span>
              <span class="pk-choice-label">Non-nasi</span>
            </button>
          </div>
        </template>

        <!-- Step 2: Texture -->
        <template v-else-if="pickerStep === 2">
          <div class="pk-head">{{ CARB_LABEL[pickerCarb] }}</div>
          <p class="pk-sub">Mau yang berkuah atau tidak?</p>
          <div class="pk-choices">
            <button class="pk-choice" @click="pickTexture('berkuah')">
              <span class="pk-choice-icon">🥣</span>
              <span class="pk-choice-label">Berkuah</span>
            </button>
            <button class="pk-choice" @click="pickTexture('tidak')">
              <span class="pk-choice-icon">🍳</span>
              <span class="pk-choice-label">Tidak</span>
            </button>
          </div>
        </template>

        <!-- Step 3: Result -->
        <template v-else>
          <div v-if="spinning" class="pk-spinning">🎲</div>
          <template v-else-if="pickerResult">
            <div class="pk-result-icon">🎉</div>
            <div class="pk-head" style="margin-bottom:6px">Makan ini yuk!</div>
            <div class="pk-result-name">{{ pickerResult.name }}</div>
            <div v-if="pickerResult.notes" class="pk-result-notes">{{ pickerResult.notes }}</div>
            <div class="pk-result-tags">
              <span class="fs-tag fs-tag-carb">{{ CARB_LABEL[pickerResult.carbType] }}</span>
              <span class="fs-tag fs-tag-tex">{{ TEX_LABEL[pickerResult.texture] }}</span>
            </div>
          </template>
          <template v-else>
            <div class="pk-result-icon">😅</div>
            <div class="pk-head">Nggak ada yang cocok nih</div>
            <p class="pk-sub">Coba yang lain, atau tambahin favorit baru!</p>
          </template>

          <div class="modal-foot" style="margin-top:20px">
            <button class="btn btn-ghost" @click="resetPicker">🎲 Pilih lagi</button>
            <button class="btn btn-sun" @click="closePicker">{{ pickerResult ? '✓ Oke, makan ini!' : 'Tutup' }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── CTA button ── */
.pk-cta-wrap { margin-bottom: 28px }
.pk-cta-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: var(--r);
  border: none;
  background: linear-gradient(135deg, #FBBF24 0%, #F97316 100%);
  cursor: pointer;
  color: #fff;
  transition: all .22s;
  box-shadow: 0 4px 20px rgba(251,191,36,.35);
}
.pk-cta-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(251,191,36,.45) }
.pk-cta-icon { font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.2)) }
.pk-cta-title { font-family: 'Fredoka One', cursive; font-size: 19px; text-align: left }
.pk-cta-sub { font-size: 12px; font-weight: 700; opacity: .85; text-align: left; margin-top: 2px }

/* ── Favorites list ── */
.fs-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px }
.fs-section-title { font-family: 'Fredoka One', cursive; font-size: 17px; color: var(--text) }
.fs-list { display: flex; flex-direction: column; gap: 10px }

.fs-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border-radius: var(--r);
  padding: 14px 16px;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all .2s;
  animation: fadeUp .2s ease;
  position: relative;
}
.fs-card:hover { box-shadow: var(--sh); border-color: var(--sun) }

.fs-card-icon { font-size: 24px; flex-shrink: 0 }
.fs-card-body { flex: 1; min-width: 0 }
.fs-card-name { font-family: 'Fredoka One', cursive; font-size: 16px; color: var(--text); margin-bottom: 4px }
.fs-card-notes { font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }

.fs-tags { display: flex; gap: 6px; flex-wrap: wrap }
.fs-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
}
.fs-tag-carb { background: rgba(251,191,36,.15); color: #B45309 }
.fs-tag-tex  { background: rgba(52,211,153,.15); color: #059669 }

.fs-del {
  position: absolute;
  top: 9px; right: 9px;
  width: 26px; height: 26px;
  border: none; background: transparent; border-radius: 7px;
  cursor: pointer; color: var(--muted); font-size: 11px;
  opacity: 0; transition: all .15s;
  display: flex; align-items: center; justify-content: center;
}
.fs-card:hover .fs-del { opacity: 1 }
.fs-del:hover { background: rgba(239,68,68,.12); color: #EF4444 }

/* ── Form segments ── */
.fs-seg-label { font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px }
.fs-seg-row { display: flex; gap: 8px; margin-bottom: 16px }
.fs-seg {
  flex: 1;
  padding: 10px 14px;
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
.fs-seg.on { border-color: var(--sun); background: rgba(251,191,36,.1); color: var(--sun-dk) }
.fs-seg:hover { border-color: var(--sun); color: var(--sun-dk) }

/* ── Picker modal ── */
.pk-modal { max-width: 360px; text-align: center }

.pk-head {
  font-family: 'Fredoka One', cursive;
  font-size: 22px;
  color: var(--text);
  margin-bottom: 4px;
}
.pk-sub {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 24px;
}

.pk-choices { display: flex; gap: 14px; justify-content: center; margin-bottom: 8px }
.pk-choice {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 16px;
  border-radius: var(--r);
  border: 2px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all .2s;
  font-family: 'Nunito', sans-serif;
}
.pk-choice:hover {
  border-color: var(--sun);
  background: rgba(251,191,36,.08);
  transform: translateY(-4px);
  box-shadow: var(--sh);
}
.pk-choice-icon { font-size: 38px }
.pk-choice-label { font-size: 15px; font-weight: 900; color: var(--text) }

.pk-spinning {
  font-size: 56px;
  animation: pkSpin 0.15s linear infinite;
  margin: 20px auto;
  display: block;
  text-align: center;
}
@keyframes pkSpin {
  from { transform: rotate(0deg) scale(1) }
  50%  { transform: rotate(180deg) scale(1.15) }
  to   { transform: rotate(360deg) scale(1) }
}

.pk-result-icon { font-size: 48px; margin-bottom: 8px }
.pk-result-name {
  font-family: 'Fredoka One', cursive;
  font-size: 26px;
  color: var(--sun-dk);
  margin-bottom: 6px;
}
.pk-result-notes {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 12px;
}
.pk-result-tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 4px }
</style>
