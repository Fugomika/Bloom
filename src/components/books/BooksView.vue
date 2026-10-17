<script setup>
import { ref, computed, watch } from 'vue'
import { DB, updateBook, setReadingGoal } from '../../composables/useStore.js'
import { today, fmtDate } from '../../utils/date.js'
import { MONTHS, BOOK_STATUSES, BOOK_FORMATS } from '../../utils/constants.js'
import BookCover from './BookCover.vue'
import BookForm from './BookForm.vue'

const statusInfo = key => BOOK_STATUSES.find(s => s.key === key) || BOOK_STATUSES[1]
const formatInfo = key => BOOK_FORMATS.find(f => f.key === key) || BOOK_FORMATS[0]

const thisYear = new Date().getFullYear()
const finishedYear = b => (b.status === 'done' && b.finished_at ? parseInt(b.finished_at.slice(0, 4)) : null)

// ── Header stats ───────────────────────────────────────────────
const byStatus = computed(() => Object.fromEntries(BOOK_STATUSES.map(s => [s.key, DB.books.filter(b => b.status === s.key)])))
const owned = computed(() => DB.books.filter(b => b.owned))
const doneThisYear = computed(() => DB.books.filter(b => finishedYear(b) === thisYear).length)
const goalThisYear = computed(() => DB.readingGoals[thisYear] || 0)

// ── Tabs ───────────────────────────────────────────────────────
const tab = ref('read')

// ── Baca tab ───────────────────────────────────────────────────
const sFilter = ref(DB.books.some(b => b.status === 'reading') ? 'reading' : 'want')
const search = ref('')

const readList = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = (byStatus.value[sFilter.value] || []).filter(b =>
    !q || b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
  if (sFilter.value === 'done') return [...list].sort((a, b) => (b.finished_at || '').localeCompare(a.finished_at || '') || b.at - a.at)
  return [...list].sort((a, b) => b.at - a.at)
})

// ── Koleksi tab ────────────────────────────────────────────────
const fFormat = ref('all')
const lent = computed(() => owned.value.filter(b => b.lent_to))
const formatCounts = computed(() =>
  BOOK_FORMATS.map(f => ({ ...f, count: owned.value.filter(b => b.format === f.key).length })).filter(f => f.count))
const collection = computed(() =>
  owned.value
    .filter(b => fFormat.value === 'all' || b.format === fFormat.value)
    .sort((a, b) => a.title.localeCompare(b.title)))

// ── Statistik tab ──────────────────────────────────────────────
const statYears = computed(() => {
  const ys = new Set([thisYear, ...DB.books.map(finishedYear).filter(Boolean), ...Object.keys(DB.readingGoals).map(Number)])
  return [...ys].sort((a, b) => b - a)
})
const statYear = ref(thisYear)
const yearDone = computed(() => DB.books.filter(b => finishedYear(b) === statYear.value))
const yearGoal = computed(() => DB.readingGoals[statYear.value] || 0)
const yearPages = computed(() => yearDone.value.reduce((s, b) => s + (b.pages || 0), 0))
const yearRated = computed(() => yearDone.value.filter(b => b.rating > 0))
const yearAvgRating = computed(() =>
  yearRated.value.length ? (yearRated.value.reduce((s, b) => s + b.rating, 0) / yearRated.value.length).toFixed(1) : '–')

// Goal pacing: how many books you "should" have by today to stay on track
const goalPace = computed(() => {
  if (!yearGoal.value || statYear.value !== thisYear) return null
  const start = new Date(thisYear, 0, 1), end = new Date(thisYear + 1, 0, 1)
  const expected = Math.floor(yearGoal.value * ((Date.now() - start) / (end - start)))
  const diff = yearDone.value.length - expected
  if (yearDone.value.length >= yearGoal.value) return { tone: 'good', text: 'Target tercapai! 🎉' }
  if (diff >= 0) return { tone: 'good', text: diff ? `${diff} buku di depan jadwal` : 'Pas sesuai jadwal' }
  return { tone: 'behind', text: `${-diff} buku di belakang jadwal` }
})

const monthly = computed(() => {
  const counts = Array(12).fill(0)
  for (const b of yearDone.value) counts[parseInt(b.finished_at.slice(5, 7)) - 1]++
  return counts.map((n, i) => ({ label: MONTHS[i], n }))
})
const monthlyMax = computed(() => Math.max(1, ...monthly.value.map(m => m.n)))
const hoverMonth = ref(null)

const ratingDist = computed(() => [5, 4, 3, 2, 1].map(r => ({ r, n: yearRated.value.filter(b => b.rating === r).length })))
const ratingMax = computed(() => Math.max(1, ...ratingDist.value.map(x => x.n)))

function topCounts(values, limit = 5) {
  const map = {}
  for (const v of values) map[v] = (map[v] || 0) + 1
  return Object.entries(map).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, limit)
}
const topGenres = computed(() => topCounts(yearDone.value.flatMap(b => b.genres)))
const topAuthors = computed(() => topCounts(yearDone.value.map(b => b.author).filter(Boolean)))
const genreMax = computed(() => Math.max(1, ...topGenres.value.map(g => g.n)))

const editingGoal = ref(false)
const goalDraft = ref('')
function startGoalEdit() { goalDraft.value = yearGoal.value || ''; editingGoal.value = true }
function saveGoal() {
  const n = parseInt(goalDraft.value)
  setReadingGoal(statYear.value, n > 0 ? n : 0)
  editingGoal.value = false
}
watch(statYear, () => { editingGoal.value = false; hoverMonth.value = null })

// ── Quick status actions ───────────────────────────────────────
function startReading(b) {
  updateBook(b.id, { status: 'reading', started_at: b.started_at || today() })
}
function finishBook(b) {
  // Open the form preset to "done" so the rating/review can be filled right away
  openEdit(b, 'done')
}

// ── Modal ──────────────────────────────────────────────────────
const showForm = ref(false)
const editBook = ref(null)
const preset = ref('')
function openAdd() { editBook.value = null; preset.value = ''; showForm.value = true }
function openEdit(b, presetStatus = '') { editBook.value = b; preset.value = presetStatus; showForm.value = true }

const EMPTY_MSG = {
  reading: { ee: '📖', h: 'Belum ada yang dibaca', p: 'Pilih satu dari daftar Mau Baca, lalu tap "Mulai baca".' },
  want:    { ee: '🔖', h: 'Daftar Mau Baca kosong', p: 'Tambahin buku yang pengen kamu baca.' },
  done:    { ee: '🏁', h: 'Belum ada yang selesai', p: 'Buku yang sudah tamat akan muncul di sini.' },
  dnf:     { ee: '⏸️', h: 'Tidak ada yang berhenti', p: 'Gak apa-apa berhenti baca buku yang gak cocok.' },
  owned:   { ee: '📚', h: 'Koleksi masih kosong', p: 'Tandai "Aku punya buku ini" di detail buku untuk memasukkannya ke koleksi.' },
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>Books</h1>
      <p>Bacaan kamu, koleksi di rak, dan target tahunan</p>
    </div>

    <!-- Stats -->
    <div class="bk-stats">
      <div class="bk-stat bk-s1">
        <span class="bk-n">{{ byStatus.reading.length }}</span>
        <div class="bk-l">sedang dibaca</div>
      </div>
      <div class="bk-stat bk-s2">
        <span class="bk-n">{{ doneThisYear }}<small v-if="goalThisYear"> / {{ goalThisYear }}</small></span>
        <div class="bk-l">selesai {{ thisYear }}</div>
      </div>
      <div class="bk-stat bk-s3">
        <span class="bk-n">{{ byStatus.want.length }}</span>
        <div class="bk-l">mau dibaca</div>
      </div>
      <div class="bk-stat bk-s4">
        <span class="bk-n">{{ owned.length }}</span>
        <div class="bk-l">di koleksi</div>
      </div>
    </div>

    <div class="bk-top-row">
      <button class="btn btn-sun" @click="openAdd">＋ Tambah Buku</button>
    </div>

    <div class="ftabs">
      <button class="ftab" :class="{ active: tab === 'read' }"  @click="tab = 'read'">Bacaan</button>
      <button class="ftab" :class="{ active: tab === 'owned' }" @click="tab = 'owned'">Koleksi · {{ owned.length }}</button>
      <button class="ftab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">Statistik</button>
    </div>

    <!-- ── Bacaan ── -->
    <template v-if="tab === 'read'">
      <div class="bk-chips">
        <button v-for="s in BOOK_STATUSES" :key="s.key" class="bk-chip" :class="{ on: sFilter === s.key }" @click="sFilter = s.key">
          {{ s.icon }} {{ s.label }} <b>{{ byStatus[s.key].length }}</b>
        </button>
      </div>
      <input v-if="DB.books.length > 6" type="search" v-model="search" class="bk-search" placeholder="Cari judul atau penulis…" />

      <div v-if="readList.length" class="bk-grid">
        <div v-for="b in readList" :key="b.id" class="bk-card" @click="openEdit(b)">
          <div class="bk-cover">
            <BookCover :book="b" />
            <span v-if="b.quotes.length" class="bk-qbadge" :title="`${b.quotes.length} kutipan`">❝ {{ b.quotes.length }}</span>
          </div>
          <div class="bk-body">
            <div class="bk-title">{{ b.title }}</div>
            <div class="bk-author">{{ b.author || '—' }}</div>
            <div v-if="b.status === 'done' && b.rating" class="bk-rating" :aria-label="`${b.rating} dari 5 bintang`">
              <span v-for="n in 5" :key="n" :class="{ on: n <= b.rating }">★</span>
            </div>
            <div v-if="b.status === 'done' && b.finished_at" class="bk-date">Selesai {{ fmtDate(b.finished_at) }}</div>
            <div v-else-if="b.status === 'reading' && b.started_at" class="bk-date">Mulai {{ fmtDate(b.started_at) }}</div>
          </div>
          <div v-if="b.status === 'want' || b.status === 'reading'" class="bk-act" @click.stop>
            <button v-if="b.status === 'want'" class="bk-act-btn" @click="startReading(b)">📖 Mulai baca</button>
            <button v-else class="bk-act-btn bk-act-done" @click="finishBook(b)">✅ Selesai</button>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <span class="ee">{{ EMPTY_MSG[sFilter].ee }}</span>
        <h3>{{ search ? 'Tidak ada yang cocok' : EMPTY_MSG[sFilter].h }}</h3>
        <p>{{ search ? 'Coba kata kunci lain.' : EMPTY_MSG[sFilter].p }}</p>
      </div>
    </template>

    <!-- ── Koleksi ── -->
    <template v-else-if="tab === 'owned'">
      <template v-if="owned.length">
        <div v-if="lent.length" class="bk-lent">
          <div class="bk-lent-head">🤝 Sedang dipinjam ({{ lent.length }})</div>
          <div v-for="b in lent" :key="b.id" class="bk-lent-row" @click="openEdit(b)">
            <span class="bk-lent-title">{{ b.title }}</span>
            <span class="bk-lent-who">{{ b.lent_to }}</span>
          </div>
        </div>

        <div class="bk-chips">
          <button class="bk-chip" :class="{ on: fFormat === 'all' }" @click="fFormat = 'all'">Semua <b>{{ owned.length }}</b></button>
          <button v-for="f in formatCounts" :key="f.key" class="bk-chip" :class="{ on: fFormat === f.key }" @click="fFormat = f.key">
            {{ f.icon }} {{ f.label }} <b>{{ f.count }}</b>
          </button>
        </div>

        <div class="bk-list">
          <div v-for="b in collection" :key="b.id" class="bk-row" @click="openEdit(b)">
            <div class="bk-row-cover"><BookCover :book="b" /></div>
            <div class="bk-row-body">
              <div class="bk-title">{{ b.title }}</div>
              <div class="bk-author">{{ b.author || '—' }}</div>
              <div class="bk-row-meta">
                <span>{{ formatInfo(b.format).icon }} {{ formatInfo(b.format).label }}</span>
                <span v-if="b.location">· {{ b.location }}</span>
              </div>
            </div>
            <div class="bk-row-side">
              <span class="badge" :style="`background:${statusInfo(b.status).color}1f;color:${statusInfo(b.status).color}`">
                {{ statusInfo(b.status).label }}
              </span>
              <span v-if="b.lent_to" class="badge bk-badge-lent">dipinjam</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty">
        <span class="ee">{{ EMPTY_MSG.owned.ee }}</span>
        <h3>{{ EMPTY_MSG.owned.h }}</h3>
        <p>{{ EMPTY_MSG.owned.p }}</p>
      </div>
    </template>

    <!-- ── Statistik ── -->
    <template v-else>
      <div class="bk-year-row">
        <select v-model.number="statYear" class="bk-year" aria-label="Tahun">
          <option v-for="y in statYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div class="bk-stat-grid">
        <!-- Goal -->
        <div class="card bk-goal">
          <div class="widget-title">Target {{ statYear }}</div>
          <template v-if="!editingGoal">
            <div class="bk-hero">
              <span class="bk-hero-n">{{ yearDone.length }}</span>
              <span class="bk-hero-of">/ {{ yearGoal || '–' }} buku</span>
            </div>
            <div v-if="yearGoal" class="bk-goal-track" role="progressbar" :aria-valuenow="yearDone.length" aria-valuemin="0" :aria-valuemax="yearGoal">
              <div class="bk-goal-fill" :style="`width:${Math.min(100, yearDone.length / yearGoal * 100)}%`"></div>
            </div>
            <p v-if="goalPace" class="bk-pace" :class="`bk-pace-${goalPace.tone}`">{{ goalPace.text }}</p>
            <button class="btn btn-ghost bk-sm" @click="startGoalEdit">{{ yearGoal ? 'Ubah target' : 'Pasang target' }}</button>
          </template>
          <div v-else class="bk-goal-edit">
            <input type="number" v-model="goalDraft" min="0" placeholder="24" @keydown.enter="saveGoal" />
            <button class="btn btn-sun bk-sm" @click="saveGoal">Simpan</button>
            <button class="btn btn-ghost bk-sm" @click="editingGoal = false">Batal</button>
          </div>
        </div>

        <!-- Numbers -->
        <div class="card bk-nums">
          <div class="bk-num"><span>{{ yearPages.toLocaleString('id-ID') }}</span><small>halaman dibaca</small></div>
          <div class="bk-num"><span>{{ yearAvgRating }}<i v-if="yearRated.length">★</i></span><small>rata-rata rating</small></div>
          <div class="bk-num"><span>{{ yearDone.length ? Math.round(yearPages / yearDone.length) : '–' }}</span><small>hlm per buku</small></div>
        </div>

        <!-- Monthly -->
        <div class="card bk-full">
          <div class="widget-title">Buku selesai per bulan</div>
          <div class="bk-chart" @mouseleave="hoverMonth = null">
            <div v-for="(m, i) in monthly" :key="m.label" class="bk-col"
                 @mouseenter="hoverMonth = i" @click="hoverMonth = hoverMonth === i ? null : i">
              <div class="bk-col-plot">
                <span v-if="m.n && (m.n === monthlyMax || hoverMonth === i)" class="bk-col-val">{{ m.n }}</span>
                <div class="bk-bar" :class="{ hover: hoverMonth === i }" :style="`height:${m.n / monthlyMax * 100}%`"></div>
              </div>
              <span class="bk-col-lbl">{{ m.label }}</span>
              <div v-if="hoverMonth === i" class="bk-tip" :class="{ 'bk-tip-r': i > 8, 'bk-tip-l': i < 3 }">
                <b>{{ m.label }} {{ statYear }}</b>
                <span>{{ m.n }} buku selesai</span>
              </div>
            </div>
          </div>
          <details class="bk-table">
            <summary>Lihat sebagai tabel</summary>
            <table>
              <tr v-for="m in monthly" :key="m.label"><td>{{ m.label }}</td><td>{{ m.n }}</td></tr>
            </table>
          </details>
        </div>

        <!-- Genres -->
        <div class="card">
          <div class="widget-title">Genre teratas</div>
          <div v-if="topGenres.length" class="bk-hbars">
            <div v-for="g in topGenres" :key="g.label" class="bk-hbar-row" :title="`${g.label}: ${g.n} buku`">
              <div class="bk-hbar-lbl"><span>{{ g.label }}</span><span>{{ g.n }}</span></div>
              <div class="bk-hbar-track"><div class="bk-hbar-fill" :style="`width:${g.n / genreMax * 100}%`"></div></div>
            </div>
          </div>
          <p v-else class="bk-empty-mini">Isi genre di detail buku untuk melihat ini.</p>
        </div>

        <!-- Ratings -->
        <div class="card">
          <div class="widget-title">Sebaran rating</div>
          <div v-if="yearRated.length" class="bk-hbars">
            <div v-for="x in ratingDist" :key="x.r" class="bk-rate-row" :title="`${x.r} bintang: ${x.n} buku`">
              <span class="bk-rate-lbl">{{ x.r }}★</span>
              <div class="bk-hbar-track"><div class="bk-hbar-fill" :style="`width:${x.n / ratingMax * 100}%`"></div></div>
              <span class="bk-rate-n">{{ x.n }}</span>
            </div>
          </div>
          <p v-else class="bk-empty-mini">Belum ada buku yang dirating tahun ini.</p>
        </div>

        <!-- Authors -->
        <div v-if="topAuthors.length" class="card bk-full">
          <div class="widget-title">Penulis paling sering</div>
          <div class="bk-authors">
            <span v-for="a in topAuthors" :key="a.label" class="bk-author-chip">{{ a.label }} <b>{{ a.n }}</b></span>
          </div>
        </div>
      </div>
    </template>

    <BookForm :open="showForm" :book="editBook" :preset-status="preset" @close="showForm = false" />
  </div>
</template>

<style scoped>
/* ── Stats ── */
.bk-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px }
.bk-stat { border-radius:var(--r); padding:18px; color:#fff; min-width:0 }
.bk-s1 { background:linear-gradient(135deg,#F59E0B,#D97706) }
.bk-s2 { background:linear-gradient(135deg,#22C55E,#15803D) }
.bk-s3 { background:linear-gradient(135deg,#3B82F6,#1D4ED8) }
.bk-s4 { background:linear-gradient(135deg,#8B5CF6,#6D28D9) }
.bk-n { font-family:'Fredoka One',cursive; font-size:28px; line-height:1; display:block }
.bk-n small { font-size:16px; opacity:.85 }
.bk-l { font-size:10px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; opacity:.88; margin-top:5px }
.bk-top-row { display:flex; gap:10px; margin-bottom:18px }

/* ── Chips / search ── */
.bk-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px }
.bk-chip {
  padding:6px 12px; border-radius:20px; border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted); cursor:pointer; white-space:nowrap; transition:all .15s;
}
.bk-chip b { font-weight:900; color:var(--text); margin-left:2px }
.bk-chip.on { border-color:var(--sun); background:var(--sun-lt); color:var(--sun-dk) }
.bk-search {
  width:100%; font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; padding:9px 12px; margin-bottom:14px;
  border:2px solid rgba(0,0,0,.09); border-radius:var(--r-sm); background:#FAFAF5; color:var(--text); outline:none;
}
.bk-search:focus { border-color:var(--sun) }

/* ── Book grid ── */
.bk-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:14px }
.bk-card {
  background:var(--surface); border-radius:var(--r-sm); box-shadow:var(--sh); overflow:hidden; cursor:pointer;
  display:flex; flex-direction:column; animation:fadeUp .2s ease; transition:transform .18s, box-shadow .18s;
}
@media (hover:hover) and (pointer:fine) {
  .bk-card:hover { transform:translateY(-3px); box-shadow:var(--sh-md) }
}
.bk-cover { position:relative; aspect-ratio:2/3 }
.bk-qbadge {
  position:absolute; right:6px; top:6px; padding:2px 7px; border-radius:20px;
  background:rgba(26,14,0,.7); color:#fff; font-size:10.5px; font-weight:900;
}
.bk-body { padding:9px 11px 10px; display:flex; flex-direction:column; gap:2px; min-width:0; flex:1 }
.bk-title { font-weight:900; font-size:13px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
.bk-author { font-size:11px; font-weight:700; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.bk-rating { font-size:12px; color:rgba(0,0,0,.14); letter-spacing:1px }
.bk-rating .on { color:var(--gold) }
.bk-date { font-size:10.5px; font-weight:800; color:var(--muted); margin-top:1px }
.bk-act { padding:0 9px 10px }
.bk-act-btn {
  width:100%; padding:7px 6px; border-radius:9px; border:1.5px solid var(--border); background:var(--bg);
  font-family:'Nunito',sans-serif; font-size:11.5px; font-weight:900; color:var(--text); cursor:pointer; transition:all .15s;
}
.bk-act-btn:hover { border-color:var(--sun) }
.bk-act-done { background:var(--leaf-lt); border-color:var(--leaf); color:var(--leaf-dk) }

/* ── Collection ── */
.bk-lent { background:var(--sun-lt); border-radius:var(--r-sm); padding:12px 14px; margin-bottom:14px }
.bk-lent-head { font-family:'Fredoka One',cursive; font-size:14px; margin-bottom:6px; color:var(--sun-dk) }
.bk-lent-row { display:flex; justify-content:space-between; gap:10px; font-size:12.5px; font-weight:800; padding:5px 0; cursor:pointer }
.bk-lent-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.bk-lent-who { color:var(--sun-dk); flex-shrink:0 }
.bk-list { display:flex; flex-direction:column; gap:8px }
.bk-row {
  display:flex; align-items:center; gap:12px; background:var(--surface); border-radius:var(--r-sm);
  padding:8px 12px 8px 8px; box-shadow:var(--sh); cursor:pointer; animation:fadeUp .2s ease;
}
.bk-row-cover { width:40px; aspect-ratio:2/3; border-radius:4px; overflow:hidden; flex-shrink:0 }
.bk-row-body { flex:1; min-width:0 }
.bk-row-body .bk-title { -webkit-line-clamp:1 }
.bk-row-meta { font-size:11px; font-weight:700; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.bk-row-side { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0 }
.bk-badge-lent { background:var(--sun-lt); color:var(--sun-dk) }

/* ── Stats tab ── */
.bk-year-row { display:flex; justify-content:flex-end; margin:-6px 0 12px }
.bk-year { width:auto }
.bk-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px }
.bk-full { grid-column:1 / -1 }
.bk-sm { padding:7px 12px; font-size:12px }

.bk-hero { display:flex; align-items:baseline; gap:6px; margin-bottom:10px }
.bk-hero-n { font-family:'Fredoka One',cursive; font-size:44px; line-height:1; color:var(--text) }
.bk-hero-of { font-size:14px; font-weight:800; color:var(--muted) }
.bk-goal-track { height:10px; border-radius:10px; background:rgba(0,0,0,.06); overflow:hidden; margin-bottom:8px }
.bk-goal-fill { height:100%; border-radius:10px; background:var(--purple); transition:width .4s ease }
.bk-pace { font-size:12px; font-weight:800; margin-bottom:10px }
.bk-pace-good { color:var(--leaf-dk) }
.bk-pace-behind { color:var(--sun-dk) }
.bk-goal-edit { display:flex; gap:8px; align-items:center }
.bk-goal-edit input { max-width:110px }

.bk-nums { display:flex; flex-direction:column; justify-content:center; gap:12px }
.bk-num { display:flex; align-items:baseline; gap:8px }
.bk-num span { font-family:'Fredoka One',cursive; font-size:26px; line-height:1; color:var(--text) }
.bk-num i { font-style:normal; color:var(--gold); font-size:20px; margin-left:2px }
.bk-num small { font-size:12px; font-weight:800; color:var(--muted) }

/* Monthly column chart: single series, one hue, recessive axis */
.bk-chart { display:grid; grid-template-columns:repeat(12,1fr); gap:2px; height:170px; border-bottom:1px solid var(--border) }
.bk-col { position:relative; display:flex; flex-direction:column; cursor:default; min-width:0 }
.bk-col-plot { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; padding:0 18% }
.bk-bar { width:100%; max-width:30px; background:var(--purple); border-radius:4px 4px 0 0; min-height:0; transition:height .35s ease, opacity .15s }
.bk-bar.hover { opacity:.8 }
.bk-col-val { font-size:11px; font-weight:900; color:var(--text); margin-bottom:3px }
.bk-col-lbl { font-size:10px; font-weight:800; color:var(--muted); text-align:center; padding-top:5px; transform:translateY(100%); position:absolute; bottom:0; left:0; right:0 }
.bk-chart { margin-bottom:22px }
.bk-tip {
  position:absolute; bottom:calc(100% - 20px); left:50%; transform:translateX(-50%); z-index:5;
  background:var(--sidebar); color:#fff; border-radius:8px; padding:6px 10px; white-space:nowrap;
  display:flex; flex-direction:column; font-size:11px; font-weight:700; pointer-events:none; box-shadow:var(--sh-md);
}
.bk-tip-l { left:0; transform:none }
.bk-tip-r { left:auto; right:0; transform:none }
.bk-tip b { font-weight:900 }
.bk-table { margin-top:6px; font-size:12px; font-weight:700; color:var(--muted) }
.bk-table summary { cursor:pointer; font-weight:800 }
.bk-table table { margin-top:6px; border-collapse:collapse; min-width:160px }
.bk-table td { padding:3px 12px 3px 0; color:var(--text) }

.bk-hbars { display:flex; flex-direction:column; gap:11px }
.bk-hbar-row { display:flex; flex-direction:column; gap:5px }
.bk-hbar-lbl { display:flex; justify-content:space-between; font-size:12px; font-weight:800; color:var(--text) }
.bk-hbar-track { height:8px; border-radius:20px; background:rgba(0,0,0,.06); overflow:hidden }
.bk-rate-row .bk-hbar-track { flex:1 }
.bk-hbar-fill { height:100%; border-radius:20px; background:var(--purple); transition:width .4s ease }
.bk-rate-row { display:flex; align-items:center; gap:10px }
.bk-rate-lbl { width:28px; font-size:12px; font-weight:900; color:var(--text) }
.bk-rate-n { width:20px; text-align:right; font-size:12px; font-weight:900; color:var(--text) }
.bk-empty-mini { font-size:12px; font-weight:700; color:var(--muted) }
.bk-authors { display:flex; flex-wrap:wrap; gap:7px }
.bk-author-chip { padding:6px 12px; border-radius:20px; background:var(--purple-lt); font-size:12px; font-weight:800; color:var(--text) }
.bk-author-chip b { color:var(--purple); margin-left:3px }

@media(max-width:960px) {
  .bk-stats { grid-template-columns:1fr 1fr }
}
@media(max-width:600px) {
  .bk-stats { gap:9px }
  .bk-stat { padding:14px }
  .bk-n { font-size:24px }
  .bk-top-row > .btn { flex:1; justify-content:center; padding:13px 14px; font-size:14px }
  .bk-chips { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; margin-right:-15px; padding-right:15px }
  .bk-chips::-webkit-scrollbar { display:none }
  .bk-grid { grid-template-columns:repeat(2, 1fr); gap:10px }
  .bk-search { font-size:16px }
  .bk-stat-grid { grid-template-columns:1fr }
  .bk-col-lbl { font-size:8.5px }
  .bk-col-plot { padding:0 10% }
}
</style>
