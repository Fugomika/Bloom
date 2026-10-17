<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  DB, addWardrobeItem, updateWardrobeItem, deleteWardrobeItem, archiveWardrobeItem, restoreWardrobeItem,
  uploadItemImage, removeItemImage, addTransaction,
} from '../../composables/useStore.js'
import { uid, today, fmtIDR } from '../../utils/date.js'
import { WARDROBE_CATEGORIES, WARDROBE_COLORS, WARDROBE_SEASONS, ARCHIVE_REASONS } from '../../utils/constants.js'
import { resizeImage, removeBackground } from '../../utils/image.js'
import ItemThumb from './ItemThumb.vue'

const props = defineProps({
  open: Boolean,
  item: { type: Object, default: null },   // null → add mode
})
const emit = defineEmits(['close'])

const BG_KEY = 'bloom_wardrobe_bg_remove'

// ── Form state ─────────────────────────────────────────────────
const fName     = ref('')
const fCategory = ref('top')
const fColors   = ref([])
const fBrand    = ref('')
const fSize     = ref('')
const fSeasons  = ref([])
const fTags     = ref('')
const fPrice    = ref('')
const fBought   = ref('')
const fNote     = ref('')
const fRecordExpense = ref(false)

// Photo: keep both versions so the bg-removal toggle can flip without re-running the model
const photoOriginal = ref(null)   // Blob
const photoCut      = ref(null)   // Blob | null
const photoCleared  = ref(false)  // user removed the existing photo
const bgRemove      = ref(readBgPref())
const bgBusy        = ref(false)
const bgProgress    = ref(0)
const bgLabel       = ref('')
const bgError       = ref('')
const previewUrl    = ref('')

const saving        = ref(false)
const saveError     = ref('')
const panel         = ref(null)   // null | 'archive' | 'delete'
const fileInput     = ref(null)

function readBgPref() {
  try { return localStorage.getItem(BG_KEY) !== 'off' } catch { return true }
}

const isEdit = computed(() => !!props.item)
const isArchived = computed(() => props.item?.status === 'archived')
const usedInOutfits = computed(() => props.item ? DB.outfits.filter(o => o.item_ids.includes(props.item.id)).length : 0)
const activePhoto = computed(() => (bgRemove.value && photoCut.value) || photoOriginal.value)
const hasPhoto = computed(() => !!activePhoto.value || (!photoCleared.value && !!props.item?.image_path))

watch(activePhoto, blob => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = blob ? URL.createObjectURL(blob) : ''
})

watch(() => props.open, open => { if (open) fill() })

function fill() {
  const it = props.item
  fName.value     = it?.name || ''
  fCategory.value = it?.category || 'top'
  fColors.value   = [...(it?.colors || [])]
  fBrand.value    = it?.brand || ''
  fSize.value     = it?.size || ''
  fSeasons.value  = [...(it?.seasons || [])]
  fTags.value     = (it?.tags || []).join(', ')
  fPrice.value    = it?.price ? String(it.price) : ''
  fBought.value   = it?.bought_date || ''
  fNote.value     = it?.note || ''
  fRecordExpense.value = false
  photoOriginal.value = null
  photoCut.value = null
  photoCleared.value = false
  bgError.value = ''
  saveError.value = ''
  panel.value = null
  saving.value = false
}

function toggleIn(listRef, key) {
  const i = listRef.value.indexOf(key)
  if (i >= 0) listRef.value.splice(i, 1)
  else listRef.value.push(key)
}

// ── Photo ──────────────────────────────────────────────────────
function pickPhoto() { fileInput.value?.click() }

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  bgError.value = ''
  photoCut.value = null
  try {
    photoOriginal.value = await resizeImage(file)
  } catch {
    bgError.value = 'Foto tidak bisa dibaca. Coba file lain.'
    return
  }
  photoCleared.value = false
  if (bgRemove.value) runBgRemoval()
}

async function runBgRemoval() {
  if (!photoOriginal.value || bgBusy.value) return
  bgBusy.value = true
  bgProgress.value = 0
  bgLabel.value = 'Menyiapkan…'
  bgError.value = ''
  const source = photoOriginal.value
  try {
    const png = await removeBackground(source, (p, label) => { bgProgress.value = p; bgLabel.value = label })
    // ignore a stale result if the user picked another photo meanwhile
    if (photoOriginal.value === source) photoCut.value = await resizeImage(png)
  } catch (err) {
    console.error('[Bloom] Background removal failed:', err)
    bgError.value = 'Gagal menghapus background — foto asli yang dipakai.'
  } finally {
    bgBusy.value = false
  }
}

function toggleBg() {
  bgRemove.value = !bgRemove.value
  try { localStorage.setItem(BG_KEY, bgRemove.value ? 'on' : 'off') } catch { /* private mode */ }
  if (bgRemove.value && photoOriginal.value && !photoCut.value) runBgRemoval()
}

function clearPhoto() {
  photoOriginal.value = null
  photoCut.value = null
  photoCleared.value = true
  bgError.value = ''
}

// ── Save ───────────────────────────────────────────────────────
const priceNum = computed(() => parseFloat(fPrice.value) || 0)
const catLabel = computed(() => WARDROBE_CATEGORIES.find(c => c.key === fCategory.value)?.label || '')

async function save() {
  if (saving.value || bgBusy.value) return
  saving.value = true
  saveError.value = ''

  const id = props.item?.id || uid()
  const oldPath = props.item?.image_path || ''
  let image_path = photoCleared.value ? '' : oldPath

  if (activePhoto.value) {
    try {
      image_path = await uploadItemImage(id, activePhoto.value)
    } catch (err) {
      console.error('[Bloom] Upload failed:', err)
      saveError.value = 'Upload foto gagal. Cek koneksi lalu coba lagi.'
      saving.value = false
      return
    }
  }
  if (oldPath && oldPath !== image_path) removeItemImage(oldPath)

  const payload = {
    name: fName.value.trim() || catLabel.value,
    category: fCategory.value,
    colors: [...fColors.value],
    brand: fBrand.value.trim(),
    size: fSize.value.trim(),
    seasons: [...fSeasons.value],
    tags: fTags.value.split(',').map(t => t.trim()).filter(Boolean),
    price: priceNum.value,
    bought_date: fBought.value,
    image_path,
    note: fNote.value.trim(),
  }

  if (isEdit.value) {
    updateWardrobeItem(id, payload)
  } else {
    let finance_tx_id = null
    if (fRecordExpense.value && priceNum.value > 0) {
      finance_tx_id = uid()
      addTransaction({
        id: finance_tx_id, type: 'expense', amount: priceNum.value, category: 'shopping',
        date: fBought.value || today(), note: `Beli ${payload.name}`, at: Date.now(),
      })
    }
    addWardrobeItem({ id, ...payload, status: 'active', archive_reason: '', archived_at: null, finance_tx_id, at: Date.now() })
  }
  saving.value = false
  emit('close')
}

function archive(reason) {
  archiveWardrobeItem(props.item.id, reason)
  emit('close')
}
function restore() {
  restoreWardrobeItem(props.item.id)
  emit('close')
}
function remove() {
  deleteWardrobeItem(props.item.id)
  emit('close')
}
function close() {
  if (saving.value) return
  emit('close')
}

// App.vue's global Escape handler only strips the .open class; keep our state in sync
function onKey(e) { if (e.key === 'Escape' && props.open) close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" :class="{ open }" @click.self="close">
    <div class="modal">
      <div class="modal-head">{{ isEdit ? 'Edit Item' : 'Tambah Item' }}</div>

      <!-- Photo -->
      <div class="wf-photo-row">
        <button class="wf-photo" :class="{ empty: !hasPhoto }" @click="pickPhoto" type="button">
          <ItemThumb v-if="hasPhoto" :item="photoCleared ? null : item" :src="previewUrl" />
          <span v-else class="wf-photo-empty">📷<small>Tambah foto</small></span>
          <div v-if="bgBusy" class="wf-busy">
            <div class="wf-spinner"></div>
            <span>{{ bgLabel }}</span>
            <div class="wf-bar"><div class="wf-bar-fill" :style="`width:${Math.round(bgProgress * 100)}%`"></div></div>
          </div>
        </button>
        <div class="wf-photo-side">
          <label class="wf-switch">
            <input type="checkbox" :checked="bgRemove" @change="toggleBg" />
            <span class="wf-switch-ui"></span>
            <span>Hapus background otomatis</span>
          </label>
          <p class="wf-hint">Diproses di HP kamu. Pertama kali perlu unduh model (~40MB).</p>
          <div class="wf-photo-acts">
            <button class="btn btn-ghost wf-sm" type="button" @click="pickPhoto">{{ hasPhoto ? 'Ganti foto' : 'Pilih foto' }}</button>
            <button v-if="hasPhoto" class="btn btn-ghost wf-sm" type="button" @click="clearPhoto">Hapus foto</button>
          </div>
          <p v-if="bgError" class="wf-err">{{ bgError }}</p>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Nama</label>
          <input type="text" v-model="fName" :placeholder="`Misal: ${catLabel} linen putih`" />
        </div>
      </div>

      <div class="wf-label">Kategori</div>
      <div class="wf-cat-grid">
        <button
          v-for="c in WARDROBE_CATEGORIES" :key="c.key" type="button"
          class="wf-cat-card" :class="{ on: fCategory === c.key }"
          :style="fCategory === c.key ? `border-color:${c.color};background:${c.color}18;color:${c.color}` : ''"
          @click="fCategory = c.key"
        >
          <span class="wf-cat-icon">{{ c.icon }}</span>
          <span>{{ c.label }}</span>
        </button>
      </div>

      <div class="wf-label">Warna</div>
      <div class="wf-swatches">
        <button
          v-for="c in WARDROBE_COLORS" :key="c.key" type="button"
          class="wf-swatch" :class="{ on: fColors.includes(c.key) }"
          :style="`background:${c.hex}`" :title="c.label" :aria-label="c.label"
          @click="toggleIn(fColors, c.key)"
        ></button>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Brand</label>
          <input type="text" v-model="fBrand" placeholder="Uniqlo, thrift…" />
        </div>
        <div class="fg">
          <label>Ukuran</label>
          <input type="text" v-model="fSize" placeholder="M, 30, 42…" />
        </div>
      </div>

      <div class="wf-label">Musim</div>
      <div class="wf-chips">
        <button
          v-for="s in WARDROBE_SEASONS" :key="s.key" type="button"
          class="wf-chip" :class="{ on: fSeasons.includes(s.key) }"
          @click="toggleIn(fSeasons, s.key)"
        >{{ s.icon }} {{ s.label }}</button>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Tag (pisahkan koma)</label>
          <input type="text" v-model="fTags" placeholder="kantor, kondangan, santai" />
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Harga (Rp)</label>
          <input type="number" v-model="fPrice" placeholder="150000" min="0" />
        </div>
        <div class="fg">
          <label>Tanggal beli</label>
          <input type="date" v-model="fBought" />
        </div>
      </div>

      <label v-if="!isEdit && priceNum > 0" class="wf-switch wf-expense">
        <input type="checkbox" v-model="fRecordExpense" />
        <span class="wf-switch-ui"></span>
        <span>Catat juga sebagai pengeluaran <b>{{ fmtIDR(priceNum) }}</b> di Finance</span>
      </label>

      <div class="fg" style="margin-bottom:4px">
        <label>Catatan (opsional)</label>
        <input type="text" v-model="fNote" placeholder="Bahan, cara cuci, ukuran pas…" />
      </div>

      <p v-if="isEdit && usedInOutfits" class="wf-used">👗 Dipakai di {{ usedInOutfits }} outfit</p>

      <!-- Archive reason picker -->
      <div v-if="panel === 'archive'" class="wf-panel">
        <div class="wf-label">Kenapa diarsipkan?</div>
        <div class="wf-reasons">
          <button v-for="r in ARCHIVE_REASONS" :key="r.key" type="button" class="wf-chip" @click="archive(r.key)">
            {{ r.icon }} {{ r.label }}
          </button>
        </div>
        <button class="btn btn-ghost wf-sm" type="button" @click="panel = null">Batal</button>
      </div>

      <!-- Delete confirm -->
      <div v-if="panel === 'delete'" class="wf-panel wf-panel-red">
        <p>Hapus permanen <b>{{ item?.name }}</b>?<template v-if="usedInOutfits"> Item juga akan dilepas dari {{ usedInOutfits }} outfit.</template></p>
        <div class="wf-photo-acts">
          <button class="btn btn-red wf-sm" type="button" @click="remove">Hapus</button>
          <button class="btn btn-ghost wf-sm" type="button" @click="panel = null">Batal</button>
        </div>
      </div>

      <p v-if="saveError" class="wf-err">{{ saveError }}</p>

      <div v-if="isEdit && !panel" class="wf-secondary">
        <button v-if="isArchived" class="btn btn-ghost wf-sm" type="button" @click="restore">↩︎ Kembalikan ke lemari</button>
        <button v-else class="btn btn-ghost wf-sm" type="button" @click="panel = 'archive'">📦 Arsipkan</button>
        <button class="btn btn-ghost wf-sm wf-del" type="button" @click="panel = 'delete'">Hapus</button>
      </div>

      <div class="modal-foot">
        <button class="btn btn-ghost" type="button" @click="close">Batal</button>
        <button class="btn btn-sun" type="button" :disabled="saving || bgBusy" @click="save">
          {{ saving ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wf-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px }

/* ── Photo ── */
.wf-photo-row { display:flex; gap:14px; margin-bottom:16px; align-items:flex-start }
.wf-photo {
  position:relative; width:132px; height:132px; flex-shrink:0; border-radius:var(--r-sm); overflow:hidden;
  border:2px solid var(--border); background:none; padding:0; cursor:pointer;
}
.wf-photo.empty { border-style:dashed; border-color:rgba(0,0,0,.15); background:#FAFAF5 }
.wf-photo-empty { display:flex; flex-direction:column; align-items:center; gap:4px; font-size:30px }
.wf-photo-empty small { font-family:'Nunito',sans-serif; font-size:11px; font-weight:800; color:var(--muted) }
.wf-busy {
  position:absolute; inset:0; background:rgba(255,251,235,.88); display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:7px; font-size:10.5px; font-weight:900; color:var(--sun-dk); padding:10px;
}
.wf-spinner { width:22px; height:22px; border-radius:50%; border:3px solid var(--sun-lt); border-top-color:var(--sun); animation:wfspin .8s linear infinite }
@keyframes wfspin { to { transform:rotate(360deg) } }
.wf-bar { width:80%; height:5px; border-radius:5px; background:var(--sun-lt); overflow:hidden }
.wf-bar-fill { height:100%; background:var(--sun); transition:width .2s }
.wf-photo-side { flex:1; min-width:0; display:flex; flex-direction:column; gap:7px }
.wf-hint { font-size:11px; font-weight:700; color:var(--muted); line-height:1.35 }
.wf-photo-acts { display:flex; gap:7px; flex-wrap:wrap }
.wf-sm { padding:7px 12px; font-size:12px }
.wf-err { font-size:12px; font-weight:800; color:#DC2626; margin-bottom:8px }

/* ── Switch ── */
.wf-switch { display:flex; align-items:center; gap:9px; font-size:12.5px; font-weight:800; cursor:pointer; color:var(--text) }
.wf-switch input { position:absolute; opacity:0; pointer-events:none }
.wf-switch-ui { width:34px; height:20px; border-radius:20px; background:rgba(0,0,0,.14); position:relative; flex-shrink:0; transition:background .18s }
.wf-switch-ui::after { content:''; position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .18s; box-shadow:0 1px 3px rgba(0,0,0,.2) }
.wf-switch input:checked + .wf-switch-ui { background:var(--leaf) }
.wf-switch input:checked + .wf-switch-ui::after { transform:translateX(14px) }
.wf-expense { margin:-4px 0 14px; padding:10px 12px; border-radius:var(--r-sm); background:var(--red-lt) }

/* ── Category grid ── */
.wf-cat-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin-bottom:16px }
.wf-cat-card {
  display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:9px 4px; border-radius:var(--r-sm); border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:10px; font-weight:800; color:var(--muted);
  transition:all .18s; text-align:center; line-height:1.15;
}
.wf-cat-icon { font-size:18px }
.wf-cat-card:hover { border-color:var(--sun) }

/* ── Colours / chips ── */
.wf-swatches { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px }
.wf-swatch {
  width:30px; height:30px; border-radius:50%; cursor:pointer;
  border:2px solid rgba(0,0,0,.12); transition:transform .15s, box-shadow .15s;
}
.wf-swatch.on { box-shadow:0 0 0 3px var(--surface), 0 0 0 5px var(--sun); transform:scale(1.05) }
.wf-chips, .wf-reasons { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:16px }
.wf-chip {
  padding:7px 12px; border-radius:20px; border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted); cursor:pointer; transition:all .15s;
}
.wf-chip.on { border-color:var(--sun); background:var(--sun-lt); color:var(--sun-dk) }
.wf-chip:hover { border-color:var(--sun) }

.wf-used { font-size:12px; font-weight:800; color:var(--purple); margin-top:10px }
.wf-panel { margin-top:14px; padding:14px; border-radius:var(--r-sm); background:var(--sun-lt); animation:fadeUp .15s ease }
.wf-panel-red { background:var(--red-lt) }
.wf-panel p { font-size:13px; font-weight:700; margin-bottom:10px }
.wf-reasons { margin-bottom:10px }
.wf-secondary { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap }
.wf-del { color:#DC2626 }
.btn:disabled { opacity:.55; cursor:default }

@media(max-width:600px) {
  .wf-cat-grid { grid-template-columns:repeat(4,1fr) }
  .wf-photo { width:112px; height:112px }
  .wf-swatch { width:32px; height:32px }
}
</style>
