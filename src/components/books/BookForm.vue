<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { addBook, updateBook, deleteBook } from '../../composables/useStore.js'
import { uid, today } from '../../utils/date.js'
import { BOOK_STATUSES, BOOK_FORMATS, BOOK_GENRES } from '../../utils/constants.js'
import { searchBooks } from '../../utils/bookSearch.js'
import BookCover from './BookCover.vue'

const props = defineProps({
  open: Boolean,
  book: { type: Object, default: null },        // null → add mode
  presetStatus: { type: String, default: '' },  // e.g. 'done' when opened from a "Selesai" quick action
})
const emit = defineEmits(['close'])

const isEdit = computed(() => !!props.book)

// ── Step: search (add mode) → details ─────────────────────────
const step = ref('search')
const query = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')
const searchInput = ref(null)
let searchTimer = null
let searchCtl = null

watch(query, q => {
  clearTimeout(searchTimer)
  if (q.trim().length < 2) { results.value = []; searchError.value = ''; searchCtl?.abort(); searching.value = false; return }
  searchTimer = setTimeout(() => runSearch(q.trim()), 450)
})

async function runSearch(q) {
  searchCtl?.abort()
  searchCtl = new AbortController()
  searching.value = true
  searchError.value = ''
  try {
    results.value = await searchBooks(q, searchCtl.signal)
  } catch (err) {
    if (err.name === 'AbortError') return
    results.value = []
    searchError.value = 'Pencarian gagal. Cek koneksi, atau isi manual.'
  }
  searching.value = false
}

function pickResult(r) {
  fill({ ...r })
  step.value = 'details'
}
function goManual() {
  fill({ title: query.value.trim() })
  step.value = 'details'
}

// ── Details form ───────────────────────────────────────────────
const f = ref({})
const newQuote = ref('')
const newQuotePage = ref('')
const confirmDel = ref(false)

function fill(src = {}) {
  f.value = {
    title: src.title || '',
    author: src.author || '',
    cover_url: src.cover_url || '',
    source_key: src.source_key || '',
    isbn: src.isbn || '',
    pages: src.pages || '',
    published_year: src.published_year || '',
    genres: [...(src.genres || [])],
    status: props.presetStatus || src.status || 'want',
    rating: src.rating || 0,
    review: src.review || '',
    started_at: src.started_at || '',
    finished_at: src.finished_at || '',
    owned: !!src.owned,
    format: src.format || 'physical',
    location: src.location || '',
    lent_to: src.lent_to || '',
    quotes: (src.quotes || []).map(q => ({ ...q })),
  }
  applyStatusDates()
  newQuote.value = ''
  newQuotePage.value = ''
  confirmDel.value = false
}

// Fill sensible dates when moving through the reading flow
function applyStatusDates() {
  const s = f.value.status
  if (s === 'reading' && !f.value.started_at) f.value.started_at = today()
  if (s === 'done' && !f.value.finished_at) f.value.finished_at = today()
}
function setStatus(key) {
  f.value.status = key
  applyStatusDates()
}

watch(() => props.open, open => {
  if (!open) { searchCtl?.abort(); return }
  query.value = ''
  results.value = []
  searchError.value = ''
  if (isEdit.value) {
    fill(props.book)
    step.value = 'details'
  } else {
    fill()
    step.value = 'search'
    nextTick(() => searchInput.value?.focus())
  }
})

function toggleGenre(g) {
  const i = f.value.genres.indexOf(g)
  if (i >= 0) f.value.genres.splice(i, 1)
  else f.value.genres.push(g)
}

function addQuote() {
  const text = newQuote.value.trim()
  if (!text) return
  f.value.quotes.unshift({ id: uid(), text, page: parseInt(newQuotePage.value) || null, at: Date.now() })
  newQuote.value = ''
  newQuotePage.value = ''
}
function removeQuote(id) {
  f.value.quotes = f.value.quotes.filter(q => q.id !== id)
}

const showRating = computed(() => f.value.status === 'done' || f.value.status === 'dnf')
const canSave = computed(() => !!f.value.title?.trim())

function save() {
  if (!canSave.value) return
  // A quote typed but not yet added shouldn't be lost
  if (newQuote.value.trim()) addQuote()
  const v = f.value
  const payload = {
    title: v.title.trim(),
    author: v.author.trim(),
    cover_url: v.cover_url.trim(),
    source_key: v.source_key,
    isbn: String(v.isbn || '').trim(),
    pages: parseInt(v.pages) || 0,
    published_year: parseInt(v.published_year) || null,
    genres: [...v.genres],
    status: v.status,
    rating: v.rating,
    review: v.review.trim(),
    started_at: v.started_at,
    finished_at: v.status === 'done' ? v.finished_at : '',
    owned: v.owned,
    format: v.format,
    location: v.owned ? v.location.trim() : '',
    lent_to: v.owned ? v.lent_to.trim() : '',
    quotes: v.quotes,
  }
  if (isEdit.value) updateBook(props.book.id, payload)
  else addBook({ id: uid(), ...payload, at: Date.now() })
  emit('close')
}

function remove() {
  deleteBook(props.book.id)
  emit('close')
}

function onKey(e) { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" :class="{ open }" @click.self="emit('close')">
    <div class="modal">
      <!-- ── Search step ── -->
      <template v-if="step === 'search'">
        <div class="modal-head">Tambah Buku</div>
        <input ref="searchInput" type="search" class="bf-search" v-model="query"
               placeholder="Cari judul, penulis, atau ISBN…" enterkeyhint="search"
               @keydown.enter.prevent="query.trim().length >= 2 && runSearch(query.trim())" />

        <div class="bf-results">
          <div v-if="searching" class="bf-hint"><span class="bf-spinner"></span> Mencari…</div>
          <p v-else-if="searchError" class="bf-err">{{ searchError }}</p>
          <template v-else>
            <button v-for="r in results" :key="r.source_key" type="button" class="bf-result" @click="pickResult(r)">
              <div class="bf-result-cover"><BookCover :book="r" /></div>
              <div class="bf-result-body">
                <div class="bf-result-title">{{ r.title }}</div>
                <div class="bf-result-meta">{{ r.author || 'Penulis tidak diketahui' }}</div>
                <div class="bf-result-meta">
                  <template v-if="r.published_year">{{ r.published_year }}</template>
                  <template v-if="r.pages"> · {{ r.pages }} hlm</template>
                </div>
              </div>
            </button>
            <p v-if="query.trim().length >= 2 && !results.length" class="bf-hint">Tidak ketemu. Coba kata kunci lain atau isi manual.</p>
            <p v-if="query.trim().length < 2" class="bf-hint">Data dari Open Library. Buku lokal kadang belum ada — isi manual saja.</p>
          </template>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" @click="emit('close')">Batal</button>
          <button class="btn btn-sun" type="button" @click="goManual">Isi manual</button>
        </div>
      </template>

      <!-- ── Details step ── -->
      <template v-else>
        <div class="modal-head bf-head">
          <button v-if="!isEdit" class="bf-back" type="button" @click="step = 'search'" aria-label="Kembali ke pencarian">‹</button>
          {{ isEdit ? 'Edit Buku' : 'Detail Buku' }}
        </div>

        <div class="bf-top">
          <div class="bf-cover"><BookCover :book="f" /></div>
          <div class="bf-top-fields">
            <div class="fg"><label>Judul</label><input type="text" v-model="f.title" placeholder="Judul buku" /></div>
            <div class="fg"><label>Penulis</label><input type="text" v-model="f.author" placeholder="Nama penulis" /></div>
          </div>
        </div>

        <div class="form-row">
          <div class="fg"><label>Halaman</label><input type="number" v-model="f.pages" min="0" placeholder="320" /></div>
          <div class="fg"><label>Tahun terbit</label><input type="number" v-model="f.published_year" min="0" placeholder="2020" /></div>
        </div>
        <div class="form-row">
          <div class="fg"><label>URL cover (opsional)</label><input type="text" v-model="f.cover_url" placeholder="https://…" /></div>
        </div>

        <div class="bf-label">Status</div>
        <div class="bf-seg">
          <button v-for="s in BOOK_STATUSES" :key="s.key" type="button" class="bf-seg-btn"
                  :class="{ on: f.status === s.key }"
                  :style="f.status === s.key ? `border-color:${s.color};background:${s.color}1a;color:${s.color}` : ''"
                  @click="setStatus(s.key)">{{ s.icon }} {{ s.label }}</button>
        </div>

        <div v-if="f.status !== 'want'" class="form-row">
          <div class="fg"><label>Mulai baca</label><input type="date" v-model="f.started_at" /></div>
          <div v-if="f.status === 'done'" class="fg"><label>Selesai baca</label><input type="date" v-model="f.finished_at" /></div>
        </div>

        <template v-if="showRating">
          <div class="bf-label">Rating</div>
          <div class="bf-stars" role="radiogroup" aria-label="Rating">
            <button v-for="n in 5" :key="n" type="button" class="bf-star" :class="{ on: n <= f.rating }"
                    role="radio" :aria-checked="n === f.rating" :aria-label="`${n} bintang`"
                    @click="f.rating = f.rating === n ? 0 : n">★</button>
          </div>
          <div class="fg" style="margin-bottom:14px">
            <label>Review singkat</label>
            <textarea v-model="f.review" class="bf-textarea" placeholder="Kesan kamu tentang buku ini…"></textarea>
          </div>
        </template>

        <div class="bf-label">Genre</div>
        <div class="bf-chips">
          <button v-for="g in BOOK_GENRES" :key="g" type="button" class="bf-chip" :class="{ on: f.genres.includes(g) }"
                  @click="toggleGenre(g)">{{ g }}</button>
        </div>

        <!-- Collection -->
        <div class="bf-box">
          <label class="bf-switch">
            <input type="checkbox" v-model="f.owned" />
            <span class="bf-switch-ui"></span>
            <span>Aku punya buku ini (masuk Koleksi)</span>
          </label>
          <template v-if="f.owned">
            <div class="bf-chips" style="margin:12px 0">
              <button v-for="fm in BOOK_FORMATS" :key="fm.key" type="button" class="bf-chip" :class="{ on: f.format === fm.key }"
                      @click="f.format = fm.key">{{ fm.icon }} {{ fm.label }}</button>
            </div>
            <div class="form-row" style="margin-bottom:0">
              <div class="fg"><label>{{ f.format === 'physical' ? 'Lokasi / rak' : 'Platform' }}</label>
                <input type="text" v-model="f.location" :placeholder="f.format === 'physical' ? 'Rak kamar, kantor…' : 'Kindle, Gramedia Digital, Storytel…'" /></div>
              <div v-if="f.format === 'physical'" class="fg"><label>Dipinjamkan ke</label>
                <input type="text" v-model="f.lent_to" placeholder="Kosongkan kalau di rumah" /></div>
            </div>
          </template>
        </div>

        <!-- Quotes -->
        <div class="bf-label">Kutipan & catatan <span v-if="f.quotes.length">({{ f.quotes.length }})</span></div>
        <div class="bf-quote-new">
          <textarea v-model="newQuote" class="bf-textarea bf-quote-input" placeholder="Tulis kutipan atau catatan…"></textarea>
          <div class="bf-quote-new-row">
            <input type="number" v-model="newQuotePage" min="0" placeholder="Hlm" class="bf-quote-page" />
            <button class="btn btn-ghost bf-sm" type="button" :disabled="!newQuote.trim()" @click="addQuote">＋ Tambah</button>
          </div>
        </div>
        <div v-for="q in f.quotes" :key="q.id" class="bf-quote">
          <p>“{{ q.text }}”</p>
          <div class="bf-quote-foot">
            <span v-if="q.page">hlm {{ q.page }}</span>
            <button type="button" class="bf-quote-del" @click="removeQuote(q.id)" aria-label="Hapus kutipan">✕</button>
          </div>
        </div>

        <div v-if="isEdit" class="bf-del-row">
          <template v-if="confirmDel">
            <span>Hapus buku ini?</span>
            <button class="btn btn-red bf-sm" type="button" @click="remove">Hapus</button>
            <button class="btn btn-ghost bf-sm" type="button" @click="confirmDel = false">Batal</button>
          </template>
          <button v-else class="btn btn-ghost bf-sm bf-del" type="button" @click="confirmDel = true">Hapus buku</button>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" type="button" @click="emit('close')">Batal</button>
          <button class="btn btn-sun" type="button" :disabled="!canSave" @click="save">Simpan</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bf-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px }
.bf-sm { padding:7px 12px; font-size:12px }
.btn:disabled { opacity:.5; cursor:default }

/* ── Search ── */
.bf-search {
  width:100%; font-family:'Nunito',sans-serif; font-size:15px; font-weight:700; padding:11px 14px;
  border:2px solid rgba(0,0,0,.09); border-radius:var(--r-sm); background:#FAFAF5; color:var(--text); outline:none; margin-bottom:12px;
}
.bf-search:focus { border-color:var(--sun); box-shadow:0 0 0 3px rgba(251,191,36,.15) }
.bf-results { display:flex; flex-direction:column; gap:6px; min-height:160px; max-height:52dvh; overflow-y:auto }
.bf-result {
  display:flex; gap:12px; align-items:center; padding:8px; border-radius:var(--r-sm);
  border:2px solid transparent; background:var(--surface); cursor:pointer; text-align:left; font-family:'Nunito',sans-serif; transition:all .15s;
}
.bf-result:hover { border-color:var(--sun); background:var(--sun-lt) }
.bf-result-cover { width:44px; aspect-ratio:2/3; border-radius:5px; overflow:hidden; flex-shrink:0; box-shadow:var(--sh) }
.bf-result-body { min-width:0 }
.bf-result-title { font-weight:900; font-size:13.5px; color:var(--text); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
.bf-result-meta { font-size:11.5px; font-weight:700; color:var(--muted) }
.bf-hint { font-size:12px; font-weight:700; color:var(--muted); padding:14px 4px; display:flex; align-items:center; gap:8px }
.bf-err { font-size:12px; font-weight:800; color:#DC2626; padding:14px 4px }
.bf-spinner { width:16px; height:16px; border-radius:50%; border:3px solid var(--sun-lt); border-top-color:var(--sun); animation:bfspin .8s linear infinite }
@keyframes bfspin { to { transform:rotate(360deg) } }

/* ── Details ── */
.bf-head { display:flex; align-items:center; gap:8px }
.bf-back { border:none; background:rgba(0,0,0,.05); width:30px; height:30px; border-radius:9px; font-size:20px; line-height:1; cursor:pointer; color:var(--text) }
.bf-top { display:flex; gap:14px; margin-bottom:14px }
.bf-cover { width:92px; aspect-ratio:2/3; border-radius:8px; overflow:hidden; flex-shrink:0; box-shadow:var(--sh-md) }
.bf-top-fields { flex:1; min-width:0; display:flex; flex-direction:column; gap:10px }

.bf-seg { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:14px }
.bf-seg-btn {
  padding:9px 4px; border-radius:var(--r-sm); border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:11.5px; font-weight:800; color:var(--muted); cursor:pointer; transition:all .15s;
}
.bf-stars { display:flex; gap:4px; margin-bottom:12px }
.bf-star { border:none; background:none; font-size:30px; line-height:1; cursor:pointer; color:rgba(0,0,0,.14); padding:2px; transition:transform .12s, color .12s }
.bf-star.on { color:var(--gold) }
.bf-star:active { transform:scale(.88) }
.bf-textarea { min-height:70px !important; resize:vertical }

.bf-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px }
.bf-chip {
  padding:6px 11px; border-radius:20px; border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:11.5px; font-weight:800; color:var(--muted); cursor:pointer; transition:all .15s;
}
.bf-chip.on { border-color:var(--sun); background:var(--sun-lt); color:var(--sun-dk) }

.bf-box { padding:12px 14px; border-radius:var(--r-sm); background:var(--bg); margin-bottom:16px }
.bf-switch { display:flex; align-items:center; gap:9px; font-size:12.5px; font-weight:800; cursor:pointer; color:var(--text) }
.bf-switch input { position:absolute; opacity:0; pointer-events:none }
.bf-switch-ui { width:34px; height:20px; border-radius:20px; background:rgba(0,0,0,.14); position:relative; flex-shrink:0; transition:background .18s }
.bf-switch-ui::after { content:''; position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .18s; box-shadow:0 1px 3px rgba(0,0,0,.2) }
.bf-switch input:checked + .bf-switch-ui { background:var(--leaf) }
.bf-switch input:checked + .bf-switch-ui::after { transform:translateX(14px) }

.bf-quote-new { display:flex; flex-direction:column; gap:7px; margin-bottom:10px }
.bf-quote-input { min-height:60px !important }
.bf-quote-new-row { display:flex; gap:8px; justify-content:flex-end }
.bf-quote-page { width:90px !important }
.bf-quote {
  border-left:3px solid var(--purple); background:var(--purple-lt); border-radius:0 var(--r-xs) var(--r-xs) 0;
  padding:9px 12px; margin-bottom:7px;
}
.bf-quote p { font-size:13px; font-weight:700; font-style:italic; white-space:pre-line; line-height:1.45 }
.bf-quote-foot { display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:11px; font-weight:800; color:var(--purple) }
.bf-quote-del { margin-left:auto; border:none; background:none; color:var(--muted); cursor:pointer; font-size:11px; padding:4px }

.bf-del-row { display:flex; align-items:center; gap:8px; margin-top:14px; font-size:13px; font-weight:800; flex-wrap:wrap }
.bf-del { color:#DC2626 }

@media(max-width:600px) {
  .bf-seg { grid-template-columns:repeat(2,1fr) }
  .bf-search { font-size:16px }
  .bf-cover { width:80px }
}
</style>
